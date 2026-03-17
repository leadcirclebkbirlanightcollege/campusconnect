-- ============================================================
-- is_faculty helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_faculty(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'faculty'
  );
$$;

-- ============================================================
-- CHANNELS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id  uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'class',
  description text,
  created_by  uuid NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channels_college_id ON public.channels(college_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(type);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view channels"
  ON public.channels FOR SELECT
  USING (is_active_user(auth.uid()));

CREATE POLICY "Admins and faculty can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE POLICY "Admins can manage channels"
  ON public.channels FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id   uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL,
  receiver_id  uuid,
  message_text text,
  attachments  jsonb DEFAULT '[]'::jsonb,
  reactions    jsonb DEFAULT '{}'::jsonb,
  reply_to_id  uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id  ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view channel messages"
  ON public.messages FOR SELECT
  USING (is_deleted = false AND is_active_user(auth.uid()));

CREATE POLICY "Active users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND is_active_user(auth.uid()));

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete messages"
  ON public.messages FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================
-- CHANNEL MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.channel_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role        text NOT NULL DEFAULT 'member',
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id    ON public.channel_members(user_id);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channel memberships"
  ON public.channel_members FOR SELECT
  USING (is_active_user(auth.uid()));

CREATE POLICY "Users can join channels"
  ON public.channel_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE POLICY "Admins can manage channel members"
  ON public.channel_members FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;

-- ============================================================
-- STORAGE BUCKET FOR MESSAGE ATTACHMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view message attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

CREATE POLICY "Authenticated users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own message attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();