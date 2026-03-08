
-- ── Student Goals ─────────────────────────────────────────────────────────────
CREATE TABLE public.student_goals (
  id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL,
  goal_type    text NOT NULL,   -- 'attendance_pct' | 'reach_tier' | 'streak_days' | 'points_total'
  target_value integer NOT NULL,
  deadline     date,
  status       text NOT NULL DEFAULT 'active',  -- 'active' | 'achieved' | 'abandoned'
  achieved_at  timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
  ON public.student_goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view goals"
  ON public.student_goals FOR SELECT
  USING (is_admin(auth.uid()));

CREATE INDEX idx_student_goals_user_status ON public.student_goals (user_id, status);

-- ── Seasonal Challenges ───────────────────────────────────────────────────────
CREATE TABLE public.challenges (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text NOT NULL,
  description   text,
  challenge_type text NOT NULL DEFAULT 'attendance',  -- 'attendance' | 'streak' | 'points' | 'checkin'
  target_value  integer NOT NULL DEFAULT 5,
  bonus_points  integer NOT NULL DEFAULT 50,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  college_id    uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  created_by    uuid NOT NULL,
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active_user(auth.uid()) AND is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

CREATE POLICY "Admins can manage challenges"
  ON public.challenges FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_challenges_active_dates ON public.challenges (is_active, start_date, end_date);
