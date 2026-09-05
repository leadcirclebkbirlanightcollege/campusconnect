-- ============================================================
-- Allow anonymous (public) visitors to read events
-- Required for public shareable event deep links
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Public can view events'
  ) THEN
    CREATE POLICY "Public can view events"
    ON public.events
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;
