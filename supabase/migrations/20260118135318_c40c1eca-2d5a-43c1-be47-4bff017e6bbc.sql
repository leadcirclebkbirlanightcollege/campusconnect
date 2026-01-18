-- Notifications: add draft/schedule/sent state
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE public.notification_status AS ENUM ('draft','scheduled','sent');
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS status public.notification_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled_for ON public.notifications (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_created_at ON public.notification_recipients (user_id, created_at DESC);

-- RLS policy update: allow users to read notifications that they have a recipient row for
-- (Keep admin access)
DROP POLICY IF EXISTS "Users can view own notifications, admins view all" ON public.notifications;
CREATE POLICY "Users can view notifications they received, admins view all"
ON public.notifications
FOR SELECT
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1
    FROM public.notification_recipients nr
    WHERE nr.notification_id = notifications.id
      AND nr.user_id = auth.uid()
  )
);

-- Realtime: enable notifications + recipients (for inbox + delivery/read tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_recipients;