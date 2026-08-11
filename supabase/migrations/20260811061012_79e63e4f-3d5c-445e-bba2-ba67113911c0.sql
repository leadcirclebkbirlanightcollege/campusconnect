DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    -- Never expose internal functions to anonymous visitors, except the public verify portal
    IF f.proname NOT IN ('verify_document_public', 'verify_document_touch') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END IF;
  END LOOP;
END $$;

-- Privileged mutators: server-side only
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unlock_achievement(uuid, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, uuid, text, text, uuid, jsonb, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_department_classes(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, integer, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, uuid, text, text, uuid, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_department_classes(uuid) TO service_role;

-- Public verification portal stays reachable without signing in
GRANT EXECUTE ON FUNCTION public.verify_document_public(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document_touch(text) TO anon, authenticated;