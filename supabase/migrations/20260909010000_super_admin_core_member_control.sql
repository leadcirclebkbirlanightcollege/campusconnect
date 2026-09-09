-- ── Centralize Campus Connect Core Team Badge Control to Super Admin ─────────
-- Ensures that ONLY super_admin can grant or revoke the Core Member badge.
-- College admins and regular admins are strictly restricted from altering is_core_member.

-- 1. Restrict admin_set_core_member RPC to super_admin ONLY
CREATE OR REPLACE FUNCTION public.admin_set_core_member(
  p_user_id uuid,
  p_is_core_member boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'permission_denied: super_admin role required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found: target profile does not exist';
  END IF;

  UPDATE public.profiles
  SET is_core_member = p_is_core_member,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_core_member(uuid, boolean) TO authenticated;

-- 2. Update profiles_guard_protected_fields to block regular admins from direct is_core_member mutation
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin has full authority over all fields including is_core_member
  IF public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- College Admin / regular admin can update institutional fields, but CANNOT alter is_core_member
  IF public.is_admin(auth.uid()) THEN
    NEW.is_core_member := OLD.is_core_member;
    RETURN NEW;
  END IF;

  -- Non-admin callers (students, faculty, anon) cannot modify any protected fields
  NEW.college_id             := OLD.college_id;
  NEW.approval_status        := OLD.approval_status;
  NEW.college_assigned       := OLD.college_assigned;
  NEW.approved_by            := OLD.approved_by;
  NEW.approved_at            := OLD.approved_at;
  NEW.rejection_reason       := OLD.rejection_reason;
  NEW.is_verified            := OLD.is_verified;
  NEW.is_core_member         := OLD.is_core_member;
  NEW.welcome_email_sent_at  := OLD.welcome_email_sent_at;
  RETURN NEW;
END;
$$;

