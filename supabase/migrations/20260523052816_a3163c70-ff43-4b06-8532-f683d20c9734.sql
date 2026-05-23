
-- 1. Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS college_assigned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS enrollment_number text,
  ADD COLUMN IF NOT EXISTS course_code text,
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS profile_submitted_at timestamptz;

-- 2. Check constraints
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_chk
    CHECK (approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_academic_year_chk
    CHECK (academic_year IS NULL OR academic_year IN ('FY','SY','TY'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Unique index on enrollment_number (case-insensitive, ignoring NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_enrollment_number_uniq
  ON public.profiles (lower(enrollment_number))
  WHERE enrollment_number IS NOT NULL;

-- 4. Backfill existing students so they are not locked out
UPDATE public.profiles
SET approval_status = 'approved',
    college_assigned = (college_id IS NOT NULL),
    profile_completed = true,
    approved_at = COALESCE(approved_at, created_at)
WHERE approval_status = 'pending'
  AND created_at < now() - interval '1 minute';

-- 5. Trigger: students cannot self-modify protected fields
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
  NEW.college_id        := OLD.college_id;
  NEW.approval_status   := OLD.approval_status;
  NEW.college_assigned  := OLD.college_assigned;
  NEW.approved_by       := OLD.approved_by;
  NEW.approved_at       := OLD.approved_at;
  NEW.rejection_reason  := OLD.rejection_reason;
  NEW.is_verified       := OLD.is_verified;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_protected_fields_trg ON public.profiles;
CREATE TRIGGER profiles_guard_protected_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_guard_protected_fields();

-- 6. Admin approve / reject RPCs
CREATE OR REPLACE FUNCTION public.admin_approve_student(
  p_user_id uuid,
  p_college_id uuid,
  p_student_id text DEFAULT NULL
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
  IF p_college_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: college_id is required';
  END IF;

  UPDATE public.profiles
  SET approval_status  = 'approved',
      college_assigned = true,
      college_id       = p_college_id,
      student_id       = COALESCE(NULLIF(p_student_id, ''), student_id),
      approved_by      = v_caller,
      approved_at      = now(),
      rejection_reason = NULL,
      updated_at       = now()
  WHERE user_id = p_user_id;

  -- Ensure role row reflects the assigned college
  INSERT INTO public.user_roles (user_id, role, college_id)
  VALUES (p_user_id, 'student', p_college_id)
  ON CONFLICT (user_id, role) DO UPDATE SET college_id = EXCLUDED.college_id;
END;
$$;

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
  SET approval_status  = 'rejected',
      college_assigned = false,
      rejection_reason = NULLIF(p_reason, ''),
      approved_by      = v_caller,
      approved_at      = now(),
      updated_at       = now()
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_student(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_student(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_student(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_student(uuid, text) TO authenticated;
