-- ── Campus Connect Core Member Architecture ──────────────────────────────
-- Extends profiles to support official Campus Connect Core Team membership.
-- Decoupled from Student Identity Verification (is_verified).

-- 1. Add is_core_member column to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_core_member boolean NOT NULL DEFAULT false;

-- 2. Index for high-performance filtering of Core Members
CREATE INDEX IF NOT EXISTS idx_profiles_is_core_member
  ON public.profiles(is_core_member)
  WHERE is_core_member = true;

-- 3. Guard protected fields against unauthorized client-side modification
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Force protected fields to OLD values for non-admin callers
  NEW.college_id        := OLD.college_id;
  NEW.approval_status   := OLD.approval_status;
  NEW.college_assigned  := OLD.college_assigned;
  NEW.approved_by       := OLD.approved_by;
  NEW.approved_at       := OLD.approved_at;
  NEW.rejection_reason  := OLD.rejection_reason;
  NEW.is_verified       := OLD.is_verified;
  NEW.is_core_member    := OLD.is_core_member;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_protected_fields_trg ON public.profiles;
CREATE TRIGGER profiles_guard_protected_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_guard_protected_fields();

-- 4. Secure Admin RPC to grant or remove Campus Connect Core Member status
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
  IF NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'permission_denied: admin role required';
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
