DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tgname, proname, prosrc
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE tgrelid = 'storage.objects'::regclass
  ) LOOP
    RAISE NOTICE 'Trigger: % calls %', r.tgname, r.proname;
  END LOOP;
END $$;
