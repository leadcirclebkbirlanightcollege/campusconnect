-- 1) Lecture lifecycle status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lecture_status') THEN
    CREATE TYPE public.lecture_status AS ENUM ('scheduled','live','ended');
  END IF;
END $$;

-- 2) Extend lectures table with UTC timestamps + status
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS status public.lecture_status NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- Backfill for existing rows (UTC)
UPDATE public.lectures
SET
  start_at = COALESCE(
    start_at,
    ((lecture_date::text || ' ' || start_time::text)::timestamp AT TIME ZONE 'UTC')
  ),
  end_at = COALESCE(
    end_at,
    ((lecture_date::text || ' ' || end_time::text)::timestamp AT TIME ZONE 'UTC')
  )
WHERE start_at IS NULL OR end_at IS NULL;

ALTER TABLE public.lectures
  ALTER COLUMN start_at SET NOT NULL,
  ALTER COLUMN end_at SET NOT NULL;

-- Keep start_at/end_at in sync when date/time change
CREATE OR REPLACE FUNCTION public.sync_lecture_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.start_at := ((NEW.lecture_date::text || ' ' || NEW.start_time::text)::timestamp AT TIME ZONE 'UTC');
  NEW.end_at   := ((NEW.lecture_date::text || ' ' || NEW.end_time::text)::timestamp AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lecture_timestamps ON public.lectures;
CREATE TRIGGER trg_sync_lecture_timestamps
BEFORE INSERT OR UPDATE OF lecture_date, start_time, end_time
ON public.lectures
FOR EACH ROW
EXECUTE FUNCTION public.sync_lecture_timestamps();

CREATE INDEX IF NOT EXISTS idx_lectures_status_start_at ON public.lectures (status, start_at);

-- 3) Notifications: link notifications to lecture + kind for idempotency
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS lecture_id UUID,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_notifications_lecture_id ON public.notifications (lecture_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled_for ON public.notifications (status, scheduled_for);

-- Best-effort uniqueness for lecture notifications
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_lecture_kind_time
ON public.notifications (lecture_id, kind, scheduled_for)
WHERE lecture_id IS NOT NULL;

-- Optional FK (no auth.users dependency)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_lecture_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_lecture_id_fkey
      FOREIGN KEY (lecture_id) REFERENCES public.lectures(id)
      ON DELETE CASCADE;
  END IF;
END $$;