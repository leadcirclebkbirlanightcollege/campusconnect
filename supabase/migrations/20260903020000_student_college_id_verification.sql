-- ============================================================================
-- Migration: Student College ID Verification & Storage Bucket Setup
-- ============================================================================

-- 1. Create Private Storage Bucket for Student ID Cards
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-id-cards',
  'student-id-cards',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage Policies for 'student-id-cards'
DROP POLICY IF EXISTS "Students can upload own ID card" ON storage.objects;
CREATE POLICY "Students can upload own ID card"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-id-cards'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Students can update own ID card" ON storage.objects;
CREATE POLICY "Students can update own ID card"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'student-id-cards'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'student-id-cards'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Students and admins can view ID cards" ON storage.objects;
CREATE POLICY "Students and admins can view ID cards"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-id-cards'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_admin(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students and admins can delete ID cards" ON storage.objects;
CREATE POLICY "Students and admins can delete ID cards"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-id-cards'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_admin(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  );

-- 2. Create student_verifications table
CREATE TABLE IF NOT EXISTS public.student_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'college_id' CHECK (document_type IN ('college_id')),
  storage_path text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verifications and admins can view all" ON public.student_verifications;
CREATE POLICY "Users can view own verifications and admins can view all"
  ON public.student_verifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own verifications" ON public.student_verifications;
CREATE POLICY "Users can insert own verifications"
  ON public.student_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own pending verifications or admins can update" ON public.student_verifications;
CREATE POLICY "Users can update own pending verifications or admins can update"
  ON public.student_verifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete verifications" ON public.student_verifications;
CREATE POLICY "Admins can delete verifications"
  ON public.student_verifications FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_student_verifications_user_id ON public.student_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON public.student_verifications(status);

-- 3. Extend public.profiles with ID card verification fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_card_path text,
  ADD COLUMN IF NOT EXISTS id_card_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS id_card_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_card_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_card_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_card_rejection_reason text;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_card_status_chk
    CHECK (id_card_status IN ('not_submitted', 'pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Guard protected profile fields in trigger
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Force protected fields to OLD values
  NEW.college_id                 := OLD.college_id;
  NEW.approval_status            := OLD.approval_status;
  NEW.college_assigned           := OLD.college_assigned;
  NEW.approved_by                := OLD.approved_by;
  NEW.approved_at                := OLD.approved_at;
  NEW.rejection_reason           := OLD.rejection_reason;
  NEW.is_verified                := OLD.is_verified;
  NEW.id_card_status             := OLD.id_card_status;
  NEW.id_card_verified_at        := OLD.id_card_verified_at;
  NEW.id_card_verified_by        := OLD.id_card_verified_by;
  NEW.id_card_rejection_reason   := OLD.id_card_rejection_reason;
  RETURN NEW;
END;
$$;

-- 5. Updated admin_approve_student RPC (enrollment_number optional)
DROP FUNCTION IF EXISTS public.admin_approve_student(uuid, uuid, text);
CREATE FUNCTION public.admin_approve_student(p_user_id uuid, p_college_id uuid, p_student_id text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_p record; v_dept record; v_class record; v_yint int;
BEGIN
  IF NOT (is_admin(v_caller) OR is_super_admin(v_caller)) THEN RAISE EXCEPTION 'permission_denied: admin role required'; END IF;
  IF p_college_id IS NULL THEN RAISE EXCEPTION 'invalid_input: college_id required'; END IF;

  SELECT * INTO v_p FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'student_not_found'; END IF;
  IF NOT v_p.profile_completed THEN RAISE EXCEPTION 'onboarding_incomplete'; END IF;
  IF v_p.approval_status = 'approved' THEN RAISE EXCEPTION 'already_approved'; END IF;

  -- Enrollment number is optional; check uniqueness only if provided
  IF v_p.enrollment_number IS NOT NULL AND length(trim(v_p.enrollment_number)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(enrollment_number) = lower(v_p.enrollment_number)
        AND user_id <> p_user_id AND approval_status = 'approved'
    ) THEN RAISE EXCEPTION 'duplicate_enrollment'; END IF;
  END IF;

  SELECT d.* INTO v_dept FROM public.departments d
   WHERE d.college_id = p_college_id AND d.is_active = true
     AND d.name ILIKE '%(' || v_p.course_code || ')%' LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'department_not_found'; END IF;

  PERFORM public.ensure_department_classes(v_dept.id);
  v_yint := year_to_int(v_p.academic_year);
  SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id AND department_id = v_dept.id AND year = v_yint LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'class_not_found'; END IF;

  UPDATE public.profiles
  SET approval_status='approved',
      college_assigned=true,
      college_id=p_college_id,
      department_id=v_dept.id,
      department=v_dept.name,
      class_id=v_class.id,
      class_name=v_class.name,
      student_id=COALESCE(NULLIF(p_student_id,''), student_id),
      approved_by=v_caller,
      approved_at=now(),
      rejection_reason=NULL,
      id_card_status='approved',
      id_card_verified_at=now(),
      id_card_verified_by=v_caller,
      id_card_rejection_reason=NULL,
      is_verified=true,
      verified_at=now(),
      verified_by=v_caller,
      updated_at=now()
  WHERE user_id = p_user_id;

  -- Update latest verification record
  UPDATE public.student_verifications
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_caller,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.student_verifications
    WHERE user_id = p_user_id
    ORDER BY submitted_at DESC
    LIMIT 1
  );

  INSERT INTO public.user_roles (user_id, role, college_id)
  VALUES (p_user_id, 'student', p_college_id)
  ON CONFLICT (user_id) DO UPDATE SET role='student', college_id=EXCLUDED.college_id;

  RETURN json_build_object(
    'ok', true,
    'department_id', v_dept.id,
    'department_name', v_dept.name,
    'class_id', v_class.id,
    'class_name', v_class.name
  );
END; $$;

-- 6. Updated admin_reject_student RPC
CREATE OR REPLACE FUNCTION public.admin_reject_student(
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'permission_denied: admin role required';
  END IF;

  UPDATE public.profiles
  SET approval_status          = 'rejected',
      college_assigned         = false,
      rejection_reason         = NULLIF(p_reason, ''),
      approved_by              = v_caller,
      approved_at              = now(),
      id_card_status           = 'rejected',
      id_card_rejection_reason = NULLIF(p_reason, ''),
      is_verified              = false,
      updated_at               = now()
  WHERE user_id = p_user_id;

  -- Update latest verification record
  UPDATE public.student_verifications
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_caller,
      rejection_reason = NULLIF(p_reason, ''),
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.student_verifications
    WHERE user_id = p_user_id
    ORDER BY submitted_at DESC
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_student(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_student(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_student(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_student(uuid, text) TO authenticated;
