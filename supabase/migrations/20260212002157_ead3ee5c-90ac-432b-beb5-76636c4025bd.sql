
-- Announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'programme', 'class')),
  target_programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  target_class text,
  is_pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view announcements" ON public.announcements FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (is_admin(auth.uid()));

-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  venue text,
  event_date date NOT NULL,
  event_time time NOT NULL,
  poster_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view events" ON public.events FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (is_admin(auth.uid()));

-- Polls table
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  is_anonymous boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view polls" ON public.polls FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Admins can manage polls" ON public.polls FOR ALL USING (is_admin(auth.uid()));

-- Poll votes table
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes" ON public.poll_votes FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Users can cast own vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user(auth.uid()));

-- Daily content (meme/suvichar)
CREATE TABLE public.daily_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('meme', 'suvichar')),
  title text,
  body text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  publish_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view daily content" ON public.daily_content FOR SELECT USING (is_active_user(auth.uid()));
CREATE POLICY "Admins can manage daily content" ON public.daily_content FOR ALL USING (is_admin(auth.uid()));

-- Enable realtime for announcements and polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
