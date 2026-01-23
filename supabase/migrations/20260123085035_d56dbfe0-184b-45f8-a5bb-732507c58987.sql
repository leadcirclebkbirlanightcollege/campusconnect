-- Add a cancellable/archive state for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'notification_status'
      AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.notification_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- Track cancellation metadata (optional but useful for auditing)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID NULL;