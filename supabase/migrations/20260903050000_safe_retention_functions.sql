-- Migration: 20260903050000_safe_retention_functions.sql
-- Description: Deploy safe version of cleanup functions handling storage deletion exceptions gracefully.

CREATE OR REPLACE FUNCTION public.delete_student_account_permanently(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth
AS $$
DECLARE
  v_prof record;
BEGIN
  -- Fetch profile
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

  -- 1. Explicitly clean up student-owned data in reverse dependency order
  DELETE FROM public.student_verifications WHERE user_id = p_user_id;
  DELETE FROM public.attendance_corrections WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;

  -- 2. Permanently remove auth account
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error deleting student %: %', p_user_id, SQLERRM;
  RETURN false;
END;
$$;

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
  -- Find all rejected students whose 2-minute retention period has elapsed
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

GRANT EXECUTE ON FUNCTION public.cleanup_expired_rejected_students() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.delete_student_account_permanently(uuid) TO authenticated;
