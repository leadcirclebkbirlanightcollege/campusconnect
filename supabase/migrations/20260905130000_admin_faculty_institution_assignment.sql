-- Migration: 20260905130000_admin_faculty_institution_assignment.sql
-- Description: Enforces admin-only modification of institutional affiliation (college_id) on profiles
--              and provides an atomic admin RPC to assign or reassign a faculty member's institution.

-- 1. Update profiles_guard_protected_fields to explicitly block non-admins from changing college_id
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
    -- Prevent non-admin from modifying college_id
    IF NEW.college_id IS DISTINCT FROM OLD.college_id THEN
      RAISE EXCEPTION 'permission_denied: only administrators can assign or modify institutional affiliation';
    END IF;

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

    -- Prevent non-admin from forging approved_by or approved_at
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

-- 2. Create atomic admin RPC to assign/change a faculty member's institution
CREATE OR REPLACE FUNCTION public.admin_assign_faculty_institution(
  p_faculty_user_id uuid,
  p_college_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_is_admin boolean;
  v_college_name text;
BEGIN
  v_caller := auth.uid();

  -- Verify caller is admin or super_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller
      AND role::text IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'permission_denied: only administrators can assign or modify institutional affiliation';
  END IF;

  -- If p_college_id is provided, verify college exists
  IF p_college_id IS NOT NULL THEN
    SELECT college_name INTO v_college_name
    FROM public.colleges
    WHERE id = p_college_id;

    IF v_college_name IS NULL THEN
      RAISE EXCEPTION 'college_not_found: specified college does not exist';
    END IF;
  END IF;

  -- 1. Update profiles table
  UPDATE public.profiles
  SET
    college_id = p_college_id,
    updated_at = now()
  WHERE user_id = p_faculty_user_id;

  -- 2. Update user_roles table for role = 'faculty'
  UPDATE public.user_roles
  SET college_id = p_college_id
  WHERE user_id = p_faculty_user_id
    AND role = 'faculty';

  RETURN jsonb_build_object(
    'success', true,
    'faculty_user_id', p_faculty_user_id,
    'college_id', p_college_id,
    'college_name', v_college_name
  );
END;
$$;

-- Grant execution to authenticated users (function checks admin authorization internally)
GRANT EXECUTE ON FUNCTION public.admin_assign_faculty_institution(uuid, uuid) TO authenticated;
