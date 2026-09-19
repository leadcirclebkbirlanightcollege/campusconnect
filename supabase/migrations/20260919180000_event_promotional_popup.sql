-- ============================================================
-- Migration: 20260919180000_event_promotional_popup.sql
-- Description: Add promotional popup configuration to events table.
-- Supports:
--   1. promotional_popup_enabled (boolean toggle)
--   2. promotional_image_url (dedicated promotional banner asset)
--   3. promotional_duration_seconds (configurable duration between 5 and 9 seconds, default 7)
--   4. promotional_start_at (optional scheduled start time)
--   5. promotional_end_at (optional scheduled end time)
-- ============================================================

DO $$
BEGIN
  -- 1. promotional_popup_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'promotional_popup_enabled'
  ) THEN
    ALTER TABLE public.events ADD COLUMN promotional_popup_enabled boolean NOT NULL DEFAULT false;
  END IF;

  -- 2. promotional_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'promotional_image_url'
  ) THEN
    ALTER TABLE public.events ADD COLUMN promotional_image_url text;
  END IF;

  -- 3. promotional_duration_seconds
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'promotional_duration_seconds'
  ) THEN
    ALTER TABLE public.events ADD COLUMN promotional_duration_seconds integer DEFAULT 7;
  END IF;

  -- Ensure check constraint on promotional_duration_seconds
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND conname = 'check_events_promotional_duration_seconds'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT check_events_promotional_duration_seconds
      CHECK (promotional_duration_seconds IS NULL OR (promotional_duration_seconds >= 5 AND promotional_duration_seconds <= 9));
  END IF;

  -- 4. promotional_start_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'promotional_start_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN promotional_start_at timestamptz;
  END IF;

  -- 5. promotional_end_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'promotional_end_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN promotional_end_at timestamptz;
  END IF;
END $$;

-- Partial index for active promotional events
CREATE INDEX IF NOT EXISTS idx_events_promotional_active
  ON public.events (promotional_popup_enabled, event_date)
  WHERE promotional_popup_enabled = true;

-- Reload PostgREST schema cache so PGRST204 resolves immediately
NOTIFY pgrst, 'reload schema';
