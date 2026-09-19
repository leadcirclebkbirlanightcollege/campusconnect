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

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS promotional_popup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promotional_image_url text,
  ADD COLUMN IF NOT EXISTS promotional_duration_seconds integer NOT NULL DEFAULT 7 
    CHECK (promotional_duration_seconds >= 5 AND promotional_duration_seconds <= 9),
  ADD COLUMN IF NOT EXISTS promotional_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS promotional_end_at timestamptz;

-- Partial index to make active promotional lookup instantaneous
CREATE INDEX IF NOT EXISTS idx_events_promotional_active
  ON public.events (promotional_popup_enabled, event_date)
  WHERE promotional_popup_enabled = true;
