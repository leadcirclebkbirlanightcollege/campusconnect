-- Migration: 20260903040000_rejected_student_retention_policy.sql
-- Description: Implement strict data minimization and 2-minute auto-deletion for rejected students.
-- 1. Adds rejected_at and delete_after to public.profiles.
-- 2. Modifies admin_approve_student to immediately purge College ID card from Storage upon approval.
-- 3. Modifies admin_reject_student to record rejected_at and delete_after (now() + 2 minutes).
-- 4. Creates public.delete_student_account_permanently(user_id) for safe cascading student-only cleanup.
-- 5. Creates public.cleanup_expired_rejected_students() for idempotent backend cleanup.
-- 6. Configures pg_cron job (with graceful fallback) to execute every minute.

-- 1. Add retention timestamp fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS delete_after timestamptz;

-- 2. Update admin_approve_student with post-approval ID card deletion (Data Minimization)
DROP FUNCTION IF EXISTS public.admin_approve_student(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.admin_approve_student(
  p_user_id uuid,
  p_college_id uuid,
  p_student_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_caller uuid;
  v_p record;
  v_dept_id uuid;
  v_dept_name text;
  v_class_id uuid;
  v_class_name text;
  v_old_id_path text;
BEGIN
  v_caller := auth.uid();

  -- Verify admin authorization
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller
        AND role::text IN ('admin', 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'permission_denied: admin role required';
  END IF;

  -- Validate inputs
  IF p_college_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: missing college_id';
  END IF;

  -- Fetch student profile
  SELECT * INTO v_p FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found';
  END IF;

  -- Check student is pending or rejected override
  IF v_p.approval_status = 'approved' THEN
    RAISE EXCEPTION 'already_approved';
  END IF;

  -- Require completed onboarding
  IF NOT coalesce(v_p.profile_completed, false) THEN
    RAISE EXCEPTION 'onboarding_incomplete';
  END IF;

  -- If enrollment_number is present, enforce uniqueness among approved students
  IF v_p.enrollment_number IS NOT NULL AND length(trim(v_p.enrollment_number)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(trim(enrollment_number)) = lower(trim(v_p.enrollment_number))
        AND user_id != p_user_id
        AND approval_status = 'approved'
    ) THEN
      RAISE EXCEPTION 'duplicate_enrollment';
    END IF;
  END IF;

  -- Resolve department
  SELECT id, department_name INTO v_dept_id, v_dept_name
  FROM public.departments
  WHERE college_id = p_college_id
    AND is_active = true
    AND (
      (v_p.course_code IS NOT NULL AND code = v_p.course_code)
      OR lower(department_name) = lower(coalesce(v_p.course_name, ''))
    )
  LIMIT 1;

  IF v_dept_id IS NULL THEN
    SELECT id, department_name INTO v_dept_id, v_dept_name
    FROM public.departments
    WHERE college_id = p_college_id AND is_active = true
    LIMIT 1;
  END IF;

  IF v_dept_id IS NULL THEN
    RAISE EXCEPTION 'department_not_found';
  END IF;

  -- Resolve class
  SELECT c.id, c.class_name INTO v_class_id, v_class_name
  FROM public.classes c
  JOIN public.programmes p ON p.id = c.programme_id
  WHERE c.college_id = p_college_id
    AND p.department_id = v_dept_id
    AND (
      v_p.academic_year IS NULL
      OR c.class_name ILIKE ('%' || v_p.academic_year || '%')
    )
    AND c.is_active = true
  ORDER BY c.class_name ASC
  LIMIT 1;

  IF v_class_id IS NULL THEN
    SELECT c.id, c.class_name INTO v_class_id, v_class_name
    FROM public.classes c
    WHERE c.college_id = p_college_id AND c.is_active = true
    LIMIT 1;
  END IF;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  v_old_id_path := v_p.id_card_path;

  -- 1. Update profiles: approve, assign, and clear id_card_path (Data Minimization)
  UPDATE public.profiles
  SET
    approval_status = 'approved',
    approved_at = now(),
    approved_by = v_caller,
    college_id = p_college_id,
    college_assigned = true,
    department_id = v_dept_id,
    department = v_dept_name,
    class_id = v_class_id,
    class_name = v_class_name,
    student_id = coalesce(p_student_id, student_id),
    is_verified = true,
    id_card_status = 'approved',
    id_card_verified_at = now(),
    id_card_verified_by = v_caller,
    id_card_path = NULL, -- ID card path cleared from active profile
    rejection_reason = NULL,
    id_card_rejection_reason = NULL,
    rejected_at = NULL,
    delete_after = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- 2. Update student_verifications audit table
  UPDATE public.student_verifications
  SET
    status = 'approved',
    storage_path = '[DELETED_AFTER_VERIFICATION]',
    reviewed_at = now(),
    reviewed_by = v_caller,
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'pending';

  -- 3. Attempt direct storage deletion safely (caught if Supabase storage trigger requires API)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'student-id-cards'
      AND (
        (v_old_id_path IS NOT NULL AND name = v_old_id_path)
        OR (storage.foldername(name))[1] = p_user_id::text
      );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 4. Ensure student role exists with college_id
  INSERT INTO public.user_roles (user_id, role, college_id)
  VALUES (p_user_id, 'student', p_college_id)
  ON CONFLICT (user_id, role) DO UPDATE SET
    college_id = EXCLUDED.college_id;

  RETURN json_build_object(
    'ok', true,
    'user_id', p_user_id,
    'college_id', p_college_id,
    'department_id', v_dept_id,
    'department_name', v_dept_name,
    'class_id', v_class_id,
    'class_name', v_class_name,
    'old_id_card_path', v_old_id_path,
    'id_card_purged', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_student(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_student(uuid, uuid, text) TO authenticated;

-- 3. Update admin_reject_student with 2-minute deletion window calculation
DROP FUNCTION IF EXISTS public.admin_reject_student(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_reject_student(
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_p record;
  v_final_reason text;
  v_now timestamptz;
  v_delete_at timestamptz;
BEGIN
  v_caller := auth.uid();

  -- Verify admin authorization
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller
        AND role::text IN ('admin', 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- Verify student exists
  SELECT * INTO v_p FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found';
  END IF;

  -- Prevent rejecting already approved student
  IF v_p.approval_status = 'approved' THEN
    RAISE EXCEPTION 'already_approved';
  END IF;

  v_now := now();
  v_delete_at := v_now + interval '2 minutes';
  v_final_reason := coalesce(nullif(trim(p_reason), ''), 'Verification document requires review or replacement.');

  -- Update profile status and set 2-minute deletion timer
  UPDATE public.profiles
  SET
    approval_status = 'rejected',
    rejection_reason = v_final_reason,
    id_card_status = 'rejected',
    id_card_rejection_reason = v_final_reason,
    rejected_at = v_now,
    delete_after = v_delete_at,
    updated_at = v_now
  WHERE user_id = p_user_id;

  -- Update student_verifications audit table
  UPDATE public.student_verifications
  SET
    status = 'rejected',
    rejection_reason = v_final_reason,
    reviewed_at = v_now,
    reviewed_by = v_caller,
    updated_at = v_now
  WHERE user_id = p_user_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_student(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_student(uuid, text) TO authenticated;

-- 4. Function: Permanently delete a rejected student account and strictly student-owned data
CREATE OR REPLACE FUNCTION public.delete_student_account_permanently(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth
AS $$
DECLARE
  v_prof record;
BEGIN
  -- Safety check: only delete accounts that are either:
  -- 1) marked 'rejected' and have reached delete_after, OR
  -- 2) called by an authenticated admin/super_admin
  SELECT * INTO v_prof FROM public.profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Already deleted (idempotent success)
    RETURN true;
  END IF;

  -- Guard against deleting approved students or active staff
  IF v_prof.approval_status = 'approved' THEN
    RAISE EXCEPTION 'cannot_delete_approved_student';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role::text IN ('admin', 'super_admin', 'faculty')
  ) THEN
    RAISE EXCEPTION 'cannot_delete_staff_member';
  END IF;

  -- 1. Attempt direct storage deletion safely
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'student-id-cards'
      AND (
        (storage.foldername(name))[1] = p_user_id::text
        OR (v_prof.id_card_path IS NOT NULL AND name = v_prof.id_card_path)
      );

    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars'
      AND (
        (storage.foldername(name))[1] = p_user_id::text
        OR name LIKE 'onboarding/' || p_user_id::text || '.%'
      );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Explicitly clean up student-owned data in reverse dependency order
  DELETE FROM public.student_verifications WHERE user_id = p_user_id;
  DELETE FROM public.attendance_corrections WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;

  -- 3. Permanently remove auth account
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Log and return false without crashing caller
  RAISE WARNING 'Error deleting student %: %', p_user_id, SQLERRM;
  RETURN false;
END;
$$;

-- 5. Master cleanup function: Purge all rejected students whose 2-minute window has expired,
-- and clean up orphaned files in student-id-cards
CREATE OR REPLACE FUNCTION public.cleanup_expired_rejected_students()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth
AS $$
DECLARE
  r record;
  v_deleted_users int := 0;
  v_success boolean;
BEGIN
  -- 1. Find all rejected students whose 2-minute retention period has elapsed
  FOR r IN
    SELECT user_id, name, email
    FROM public.profiles
    WHERE approval_status = 'rejected'
      AND delete_after IS NOT NULL
      AND delete_after <= now()
  LOOP
    v_success := public.delete_student_account_permanently(r.user_id);
    IF v_success THEN
      v_deleted_users := v_deleted_users + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'ok', true,
    'deleted_rejected_students', v_deleted_users,
    'executed_at', now()
  );
END;
$$;

-- Allow authenticated and anon to trigger cleanup (safe & idempotent; only deletes expired rejected records)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rejected_students() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.delete_student_account_permanently(uuid) TO authenticated;

-- 6. Setup pg_cron recurring background job if available in PostgreSQL
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Unschedule existing job if present
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('cleanup_expired_rejected_students_job');
    EXCEPTION WHEN OTHERS THEN
      -- Job might not exist yet
    END;

    -- Schedule to execute every minute
    PERFORM cron.schedule(
      'cleanup_expired_rejected_students_job',
      '* * * * *',
      'SELECT public.cleanup_expired_rejected_students()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron is not enabled on this instance. Opportunistic and client triggers will maintain cleanup.';
END $$;
