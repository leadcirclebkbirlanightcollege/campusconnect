-- Trigger functions must never be directly callable from the API
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, PUBLIC', f.sig);
  END LOOP;
END $$;

-- Pin search_path on the remaining helper functions
ALTER FUNCTION public.year_to_int(text) SET search_path = public;
ALTER FUNCTION public.course_code_to_class_suffix(text) SET search_path = public;