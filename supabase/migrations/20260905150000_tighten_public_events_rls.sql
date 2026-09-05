-- ============================================================
-- Migration: 20260905150000_tighten_public_events_rls.sql
-- Description: Restrict anonymous events read policy.
--   Anonymous visitors may ONLY view events that:
--   1. Belong to an existing, active college (is_active = true)
--   2. The college has the events module enabled (or null default)
--   3. The event is a valid, scheduled event with a non-empty title, date, and time
-- ============================================================

DROP POLICY IF EXISTS "Public can view events" ON public.events;
DROP POLICY IF EXISTS "Public can view published events" ON public.events;

CREATE POLICY "Public can view published events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (
  -- 1. College must exist, be active, and have events enabled
  college_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.colleges c
    WHERE c.id = events.college_id
      AND c.is_active = true
      AND (c.enabled_features IS NULL OR c.enabled_features @> '["events"]'::jsonb)
  )
  -- 2. Event must be fully published with valid title, date, and time (not a draft)
  AND title IS NOT NULL AND length(trim(title)) > 0
  AND event_date IS NOT NULL
  AND event_time IS NOT NULL
);
