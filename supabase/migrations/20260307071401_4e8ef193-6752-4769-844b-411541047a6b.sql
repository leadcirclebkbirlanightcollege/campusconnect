
-- Create achievements definition table
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  points_reward integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active achievements"
  ON public.achievements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Seed default achievements
INSERT INTO public.achievements (code, title, description, icon, points_reward) VALUES
  ('first_attendance', 'First Step', 'Marked your first attendance', '👟', 5),
  ('streak_7', '7-Day Warrior', 'Logged in 7 days in a row', '🔥', 20),
  ('streak_30', '30-Day Legend', 'Logged in 30 days in a row', '💎', 100),
  ('attendance_perfect', 'Perfect Attendance', 'Attended all lectures this month', '⭐', 50),
  ('points_100', 'Century Club', 'Earned 100 points total', '💯', 10),
  ('points_500', 'High Achiever', 'Earned 500 points total', '🚀', 25),
  ('top_10', 'Top 10 Ranked', 'Reached the top 10 leaderboard', '🏅', 30),
  ('gold_tier', 'Gold Tier Reached', 'Achieved Gold tier status', '🥇', 50)
ON CONFLICT (code) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);
