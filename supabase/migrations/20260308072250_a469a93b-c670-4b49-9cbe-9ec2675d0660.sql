
-- ═══════════════════════════════════════════════════════════
-- Secure server-side RPCs
-- award_points  → validate caller is admin/service before inserting
-- unlock_achievement → idempotent, server-side only
-- log_audit_event → convenience wrapper for edge functions
-- ═══════════════════════════════════════════════════════════

-- Helper: write to audit_logs (security definer so edge fns can use it)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action        text,
  p_performed_by  uuid,
  p_target_entity text,
  p_target_id     text   DEFAULT NULL,
  p_college_id    uuid   DEFAULT NULL,
  p_details       jsonb  DEFAULT '{}'::jsonb,
  p_ip_address    text   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs(action, performed_by, target_entity, target_id, college_id, details, ip_address)
  VALUES (p_action, p_performed_by, p_target_entity, p_target_id, p_college_id, p_details, p_ip_address);
END;
$$;

-- award_points — authenticated, role-checked
-- Only admins or super_admins may call this; students cannot
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id   uuid,
  p_points    int,
  p_source    text,
  p_note      text    DEFAULT NULL,
  p_source_id text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- Only admins / super_admins may award points via this RPC
  IF NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'permission_denied: admin role required to award points';
  END IF;

  IF p_points = 0 THEN
    RAISE EXCEPTION 'invalid_input: points cannot be zero';
  END IF;

  IF p_source IS NULL OR length(trim(p_source)) = 0 THEN
    RAISE EXCEPTION 'invalid_input: source is required';
  END IF;

  INSERT INTO public.points_ledger(user_id, points, source, note, source_id, created_by)
  VALUES (p_user_id, p_points, p_source, p_note, p_source_id, v_caller);
END;
$$;

-- unlock_achievement — idempotent, admin-only via RPC
CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id uuid,
  p_code    text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean   -- returns TRUE if newly unlocked, FALSE if already had it
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ach    record;
  v_exists boolean;
BEGIN
  -- Admins and super_admins may unlock for others; students cannot
  IF NOT (public.is_admin(v_caller) OR public.is_super_admin(v_caller)) THEN
    RAISE EXCEPTION 'permission_denied: admin role required';
  END IF;

  -- Check achievement exists and is active
  SELECT * INTO v_ach FROM public.achievements WHERE code = p_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: achievement % does not exist or is inactive', p_code;
  END IF;

  -- Idempotent check
  SELECT EXISTS(
    SELECT 1 FROM public.student_achievements
    WHERE user_id = p_user_id AND code = p_code
  ) INTO v_exists;

  IF v_exists THEN
    RETURN false;
  END IF;

  -- Insert achievement
  INSERT INTO public.student_achievements(user_id, code, metadata)
  VALUES (p_user_id, p_code, p_metadata);

  -- Award points reward
  IF v_ach.points_reward > 0 THEN
    INSERT INTO public.points_ledger(user_id, points, source, note, source_id, created_by)
    VALUES (p_user_id, v_ach.points_reward, 'achievement_unlock', v_ach.title, v_ach.id::text, v_caller);
  END IF;

  RETURN true;
END;
$$;

-- Revoke public execute on these — only authenticated users with correct role can call
REVOKE ALL ON FUNCTION public.award_points(uuid, int, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_achievement(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, int, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, uuid, text, text, uuid, jsonb, text) TO authenticated;
