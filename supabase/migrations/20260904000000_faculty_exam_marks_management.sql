-- Migration: 20260904000000_faculty_exam_marks_management.sql
-- Description: Faculty Exam & Marks Management, Locking, Absent State, Admin Unlock & Server-Side Security

-- 1. Extend public.exams
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_type text,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS min_marks numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'MARKS_ENTRY',
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure valid exam status values
ALTER TABLE public.exams DROP CONSTRAINT IF EXISTS exams_status_check;
ALTER TABLE public.exams
  ADD CONSTRAINT exams_status_check
  CHECK (status IN ('DRAFT', 'MARKS_ENTRY', 'LOCKED', 'PUBLISHED'));

-- Sync legacy title & subject with exam_type & topic
UPDATE public.exams
SET exam_type = title
WHERE exam_type IS NULL AND title IS NOT NULL;

UPDATE public.exams
SET topic = subject
WHERE topic IS NULL AND subject IS NOT NULL;

-- 2. Extend public.exam_results
ALTER TABLE public.exam_results
  ALTER COLUMN marks_obtained DROP NOT NULL;

ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS is_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PASSED';

ALTER TABLE public.exam_results DROP CONSTRAINT IF EXISTS exam_results_status_check;
ALTER TABLE public.exam_results
  ADD CONSTRAINT exam_results_status_check
  CHECK (status IN ('PASSED', 'FAILED', 'ABSENT', 'PENDING'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exams_college_status ON public.exams(college_id, status);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_student ON public.exam_results(exam_id, student_user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_status ON public.exam_results(status);

-- 3. Trigger: Server-side guard preventing modifications to locked or published exam marks
CREATE OR REPLACE FUNCTION public.guard_locked_exam_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exam_id uuid;
  v_status text;
  v_caller uuid := auth.uid();
BEGIN
  -- Super admins and college admins can override when necessary
  IF is_admin(v_caller) OR is_super_admin(v_caller) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_exam_id := COALESCE(NEW.exam_id, OLD.exam_id);
  SELECT status INTO v_status FROM public.exams WHERE id = v_exam_id;

  IF v_status IN ('LOCKED', 'PUBLISHED') THEN
    RAISE EXCEPTION 'Exam marks are locked or published and cannot be modified by faculty. Contact an administrator to unlock.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_locked_exam_results ON public.exam_results;
CREATE TRIGGER trg_guard_locked_exam_results
BEFORE INSERT OR UPDATE OR DELETE ON public.exam_results
FOR EACH ROW
EXECUTE FUNCTION public.guard_locked_exam_results();

-- 4. Notification trigger: Only notify when result is actually PUBLISHED
CREATE OR REPLACE FUNCTION public.notify_on_result_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exam record;
BEGIN
  -- Verify parent exam is published before sending notification
  SELECT id, title, exam_type, status INTO v_exam FROM public.exams WHERE id = NEW.exam_id;
  IF FOUND AND v_exam.status = 'PUBLISHED' THEN
    INSERT INTO public.notifications (title, body, kind, created_by, status, sent_at, target_user_id)
    VALUES (
      'Exam Result Published',
      'Your result for ' || COALESCE(v_exam.exam_type, v_exam.title, 'examination') || ' has been published. Check your results tab.',
      'general',
      NEW.entered_by,
      'sent',
      NOW(),
      NEW.student_user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Trigger: When exam status becomes PUBLISHED, notify all enrolled students with results
CREATE OR REPLACE FUNCTION public.notify_all_students_on_exam_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  r record;
  v_exam_name text;
BEGIN
  IF NEW.status = 'PUBLISHED' AND (OLD.status IS DISTINCT FROM 'PUBLISHED') THEN
    v_exam_name := COALESCE(NEW.exam_type, NEW.title, 'Examination');
    FOR r IN
      SELECT student_user_id
      FROM public.exam_results
      WHERE exam_id = NEW.id
    LOOP
      INSERT INTO public.notifications (title, body, kind, created_by, status, sent_at, target_user_id)
      VALUES (
        'Exam Result Published: ' || v_exam_name,
        'Your result for ' || v_exam_name || ' has been published. Check your results page.',
        'general',
        COALESCE(NEW.published_by, NEW.created_by),
        'sent',
        NOW(),
        r.student_user_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_exam_published ON public.exams;
CREATE TRIGGER trg_notify_exam_published
AFTER UPDATE OF status ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_students_on_exam_published();

-- 6. Secure RPCs for Exam & Marks Management

-- 6.1 Save Exam Marks Batch
CREATE OR REPLACE FUNCTION public.faculty_save_exam_marks(
  p_exam_id uuid,
  p_results jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_exam record;
  v_item jsonb;
  v_student_id uuid;
  v_marks numeric;
  v_is_absent boolean;
  v_remarks text;
  v_status text;
  v_grade text;
  v_saved_count int := 0;
  v_pct numeric;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;

  -- Caller must be exam creator or admin
  IF NOT (v_exam.created_by = v_caller OR is_admin(v_caller) OR is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'Permission denied: you are not authorized to edit marks for this exam';
  END IF;

  -- Verify exam is not locked or published
  IF v_exam.status IN ('LOCKED', 'PUBLISHED') AND NOT (is_admin(v_caller) OR is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'Cannot edit marks: exam is %', v_exam.status;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    v_student_id := (v_item->>'student_user_id')::uuid;
    v_is_absent := COALESCE((v_item->>'is_absent')::boolean, false);
    v_remarks := NULLIF(trim(v_item->>'remarks'), '');

    IF v_is_absent THEN
      v_marks := NULL;
      v_status := 'ABSENT';
      v_grade := 'AB';
    ELSE
      IF v_item ? 'marks_obtained' AND v_item->>'marks_obtained' IS NOT NULL AND trim(v_item->>'marks_obtained') <> '' THEN
        v_marks := (v_item->>'marks_obtained')::numeric;
        IF v_marks < 0 THEN
          RAISE EXCEPTION 'Marks cannot be negative for student %', v_student_id;
        END IF;
        IF v_marks > v_exam.max_marks THEN
          RAISE EXCEPTION 'Marks (%s) exceed maximum marks (%s) for student %', v_marks, v_exam.max_marks, v_student_id;
        END IF;

        IF v_marks >= v_exam.min_marks THEN
          v_status := 'PASSED';
        ELSE
          v_status := 'FAILED';
        END IF;

        v_pct := (v_marks / NULLIF(v_exam.max_marks, 0)) * 100;
        IF v_pct >= 90 THEN v_grade := 'O';
        ELSIF v_pct >= 75 THEN v_grade := 'A+';
        ELSIF v_pct >= 60 THEN v_grade := 'A';
        ELSIF v_pct >= 50 THEN v_grade := 'B';
        ELSIF v_pct >= 40 THEN v_grade := 'C';
        ELSE v_grade := 'F';
        END IF;
      ELSE
        v_marks := NULL;
        v_status := 'PENDING';
        v_grade := NULL;
      END IF;
    END IF;

    -- Upsert exam result record
    INSERT INTO public.exam_results (
      exam_id,
      student_user_id,
      college_id,
      marks_obtained,
      is_absent,
      status,
      grade,
      remarks,
      entered_by,
      updated_at
    ) VALUES (
      p_exam_id,
      v_student_id,
      v_exam.college_id,
      v_marks,
      v_is_absent,
      v_status,
      v_grade,
      v_remarks,
      v_caller,
      now()
    )
    ON CONFLICT (exam_id, student_user_id)
    DO UPDATE SET
      marks_obtained = EXCLUDED.marks_obtained,
      is_absent = EXCLUDED.is_absent,
      status = EXCLUDED.status,
      grade = EXCLUDED.grade,
      remarks = EXCLUDED.remarks,
      entered_by = EXCLUDED.entered_by,
      updated_at = now();

    v_saved_count := v_saved_count + 1;
  END LOOP;

  UPDATE public.exams
  SET updated_at = now()
  WHERE id = p_exam_id;

  RETURN json_build_object(
    'ok', true,
    'saved_count', v_saved_count,
    'exam_id', p_exam_id
  );
END;
$$;

-- 6.2 Lock Exam Marks
CREATE OR REPLACE FUNCTION public.faculty_lock_exam(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_exam record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;

  IF NOT (v_exam.created_by = v_caller OR is_admin(v_caller) OR is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_exam.status = 'PUBLISHED' THEN
    RAISE EXCEPTION 'Exam is already published';
  END IF;

  UPDATE public.exams
  SET
    status = 'LOCKED',
    locked_at = now(),
    locked_by = v_caller,
    updated_at = now()
  WHERE id = p_exam_id;

  RETURN json_build_object('ok', true, 'status', 'LOCKED');
END;
$$;

-- 6.3 Publish Exam Results
CREATE OR REPLACE FUNCTION public.faculty_publish_exam(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_exam record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;

  IF NOT (v_exam.created_by = v_caller OR is_admin(v_caller) OR is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Ensure it is locked first
  IF v_exam.status <> 'LOCKED' AND NOT (is_admin(v_caller) OR is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'Exam must be locked before publishing';
  END IF;

  UPDATE public.exams
  SET
    status = 'PUBLISHED',
    published_at = now(),
    published_by = v_caller,
    updated_at = now()
  WHERE id = p_exam_id;

  RETURN json_build_object('ok', true, 'status', 'PUBLISHED');
END;
$$;

-- 6.4 Admin Unlock Exam Marks
CREATE OR REPLACE FUNCTION public.admin_unlock_exam(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_exam record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT (is_admin(v_caller) OR is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'Only college administrators can unlock exam marks';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;

  UPDATE public.exams
  SET
    status = 'MARKS_ENTRY',
    unlocked_at = now(),
    unlocked_by = v_caller,
    updated_at = now()
  WHERE id = p_exam_id;

  RETURN json_build_object('ok', true, 'status', 'MARKS_ENTRY');
END;
$$;

-- 7. Grant Permissions on RPCs
GRANT EXECUTE ON FUNCTION public.faculty_save_exam_marks(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.faculty_lock_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.faculty_publish_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlock_exam(uuid) TO authenticated;

-- 8. Row Level Security Policies

-- public.exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can view exams" ON public.exams;
CREATE POLICY "Active users can view exams" ON public.exams FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    (is_admin(auth.uid()) OR is_faculty(auth.uid()))
    AND college_id = get_my_college_id()
  )
  OR (
    is_active_user(auth.uid())
    AND is_active = true
    AND status = 'PUBLISHED'
    AND college_id = get_my_college_id()
  )
);

DROP POLICY IF EXISTS "Admins and faculty can manage exams" ON public.exams;
CREATE POLICY "Admins and faculty can manage exams" ON public.exams FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (
    (is_admin(auth.uid()) OR is_faculty(auth.uid()))
    AND college_id = get_my_college_id()
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    (is_admin(auth.uid()) OR is_faculty(auth.uid()))
    AND college_id = get_my_college_id()
  )
);

-- public.exam_results
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own results" ON public.exam_results;
CREATE POLICY "Students can view own results" ON public.exam_results FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR (
    is_faculty(auth.uid())
    AND college_id = get_my_college_id()
  )
  OR (
    student_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_results.exam_id
        AND e.status = 'PUBLISHED'
    )
  )
);

DROP POLICY IF EXISTS "Admins and faculty can manage results" ON public.exam_results;
CREATE POLICY "Admins and faculty can manage results" ON public.exam_results FOR ALL
USING (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR (
    is_faculty(auth.uid())
    AND college_id = get_my_college_id()
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR is_admin(auth.uid())
  OR (
    is_faculty(auth.uid())
    AND college_id = get_my_college_id()
  )
);
