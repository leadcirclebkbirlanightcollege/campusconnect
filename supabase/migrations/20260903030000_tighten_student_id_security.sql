-- Migration: 20260903030000_tighten_student_id_security.sql
-- Description: Provide helper functions for role checks, restrict Student ID card storage
-- and audit access exclusively to Admin / Super Admin (Faculty excluded), tighten RLS insert
-- check on student_verifications, enforce strict trigger field protections, and reinforce
-- rejection RPC reason fallback.

-- 1. Create helper functions for role checks if not present
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- 2. Tighten Storage RLS on 'student-id-cards' bucket
-- Exclude Faculty: only student (own file) and Admin / Super Admin (all files) have access.
DROP POLICY IF EXISTS "Staff can view all ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all ID cards" ON storage.objects;

CREATE POLICY "Admins can view all ID cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-id-cards'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin')
  )
);

-- 3. Tighten Table RLS on 'public.student_verifications'
-- Exclude Faculty: only Admin / Super Admin can view all audit records.
DROP POLICY IF EXISTS "Staff can view all verifications" ON public.student_verifications;
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.student_verifications;

CREATE POLICY "Admins can view all verifications"
  ON public.student_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('admin', 'super_admin')
    )
  );

-- Tighten student INSERT policy on student_verifications:
-- Students may only insert records for themselves with status = 'pending',
-- and cannot pre-populate reviewed_by, reviewed_at, or rejection_reason.
DROP POLICY IF EXISTS "Students can insert own verifications" ON public.student_verifications;

CREATE POLICY "Students can insert own verifications"
  ON public.student_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
  );

-- Tighten student UPDATE policy on student_verifications:
-- Ensure only Admins / Super Admins can update verification records.
DROP POLICY IF EXISTS "Admins can update verifications" ON public.student_verifications;

CREATE POLICY "Admins can update verifications"
  ON public.student_verifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('admin', 'super_admin')
    )
  );

-- 4. Tighten profiles field protection trigger
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role and superuser bypass
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Client-level check for non-administrative callers
  IF auth.uid() IS NOT NULL AND NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('admin', 'super_admin')
    )
  ) THEN
    -- Only allow transition to 'pending' for approval_status (or unchanged)
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NEW.approval_status != 'pending' THEN
      RAISE EXCEPTION 'permission_denied: cannot self-approve or reject profile';
    END IF;

    -- Only allow transition to 'pending' for id_card_status (or unchanged)
    IF NEW.id_card_status IS DISTINCT FROM OLD.id_card_status AND NEW.id_card_status != 'pending' THEN
      RAISE EXCEPTION 'permission_denied: cannot self-approve or reject id_card_status';
    END IF;

    -- Prevent student from marking college assigned
    IF NEW.college_assigned IS DISTINCT FROM OLD.college_assigned AND NEW.college_assigned = true THEN
      RAISE EXCEPTION 'permission_denied: cannot assign college to self';
    END IF;

    -- Prevent student from forging approved_by or approved_at
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'permission_denied: cannot modify approved_by';
    END IF;

    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'permission_denied: cannot modify approved_at';
    END IF;

    -- Prevent non-admin from modifying rejection_reason (unless clearing it on resubmission to NULL)
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason AND NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'permission_denied: cannot forge rejection_reason';
    END IF;

    -- Prevent student from self-verifying badge
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NEW.is_verified = true THEN
      RAISE EXCEPTION 'permission_denied: cannot self-verify';
    END IF;

    -- Prevent non-admin from modifying verification audit timestamps or users
    IF NEW.id_card_verified_at IS DISTINCT FROM OLD.id_card_verified_at THEN
      RAISE EXCEPTION 'permission_denied: cannot modify id_card_verified_at';
    END IF;

    IF NEW.id_card_verified_by IS DISTINCT FROM OLD.id_card_verified_by THEN
      RAISE EXCEPTION 'permission_denied: cannot modify id_card_verified_by';
    END IF;

    IF NEW.id_card_rejection_reason IS DISTINCT FROM OLD.id_card_rejection_reason AND NEW.id_card_rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'permission_denied: cannot forge id_card_rejection_reason';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update admin_reject_student to guarantee non-empty fallback reason (RETURNS void)
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

  -- Determine non-empty feedback reason
  v_final_reason := coalesce(nullif(trim(p_reason), ''), 'Verification document requires review or replacement.');

  -- Update profile status
  UPDATE public.profiles
  SET
    approval_status = 'rejected',
    rejection_reason = v_final_reason,
    id_card_status = 'rejected',
    id_card_rejection_reason = v_final_reason,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Update student_verifications audit table
  UPDATE public.student_verifications
  SET
    status = 'rejected',
    rejection_reason = v_final_reason,
    reviewed_at = now(),
    reviewed_by = v_caller,
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_student(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_student(uuid, text) TO authenticated;
