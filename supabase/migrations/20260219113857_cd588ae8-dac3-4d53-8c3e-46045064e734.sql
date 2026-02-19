-- =============================
-- Daily retention & engagement
-- =============================

-- 1) Student login streaks
CREATE TABLE IF NOT EXISTS public.student_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_streaks' AND policyname='Users can view own streak, admins view all'
  ) THEN
    CREATE POLICY "Users can view own streak, admins view all"
    ON public.student_streaks
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- No direct client mutations (service role will write)

CREATE INDEX IF NOT EXISTS idx_student_streaks_user_id ON public.student_streaks(user_id);


-- 2) Daily rewards log (once per day)
CREATE TABLE IF NOT EXISTS public.daily_rewards_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_date date NOT NULL,
  reward_type text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_rewards_user_date
ON public.daily_rewards_log(user_id, reward_date);

ALTER TABLE public.daily_rewards_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='daily_rewards_log' AND policyname='Users can view own daily rewards, admins view all'
  ) THEN
    CREATE POLICY "Users can view own daily rewards, admins view all"
    ON public.daily_rewards_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date
ON public.daily_rewards_log(user_id, reward_date DESC);


-- 3) Achievements (immutable grants)
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_achievements_user_code
ON public.student_achievements(user_id, code);

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_achievements' AND policyname='Users can view own achievements, admins view all'
  ) THEN
    CREATE POLICY "Users can view own achievements, admins view all"
    ON public.student_achievements
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- No UPDATE/DELETE policies: immutable by default

CREATE INDEX IF NOT EXISTS idx_student_achievements_user_id ON public.student_achievements(user_id);


-- 4) Extend points ledger allowed sources + insert policy for daily reward
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source = ANY (ARRAY[
    'attendance'::text,
    'manual'::text,
    'event'::text,
    'admin_adjustment'::text,
    'daily_reward'::text
  ]));

DROP POLICY IF EXISTS "System can insert attendance points" ON public.points_ledger;
CREATE POLICY "System can insert attendance points"
ON public.points_ledger
FOR INSERT
TO authenticated
WITH CHECK (
  source = ANY (ARRAY['attendance'::text, 'daily_reward'::text])
  OR public.is_admin(auth.uid())
);


-- =============================
-- Corrections module: server RPC
-- =============================

CREATE OR REPLACE FUNCTION public.admin_get_attendance_corrections(
  p_lecture_id uuid,
  p_search text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 20
)
RETURNS TABLE (
  attendance_id uuid,
  student_user_id uuid,
  student_name text,
  student_id text,
  programme text,
  status text,
  marked_at timestamptz,
  edited_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    a.id AS attendance_id,
    a.student_user_id,
    COALESCE(p.name, 'Unknown') AS student_name,
    COALESCE(p.student_id, '—') AS student_id,
    COALESCE(pr.name, '—') AS programme,
    a.status,
    a.marked_at,
    a.edited_at,
    COUNT(*) OVER() AS total_count
  FROM public.attendance a
  LEFT JOIN public.profiles p ON p.user_id = a.student_user_id
  LEFT JOIN public.student_programme_allotments spa ON spa.student_user_id = a.student_user_id
  LEFT JOIN public.programmes pr ON pr.id = spa.programme_id
  WHERE public.is_admin(auth.uid())
    AND a.lecture_id = p_lecture_id
    AND (p_start_date IS NULL OR a.marked_at::date >= p_start_date)
    AND (p_end_date IS NULL OR a.marked_at::date <= p_end_date)
    AND (
      p_search IS NULL OR btrim(p_search) = ''
      OR COALESCE(p.name, '') ILIKE ('%' || p_search || '%')
      OR COALESCE(p.student_id, '') ILIKE ('%' || p_search || '%')
      OR COALESCE(pr.name, '') ILIKE ('%' || p_search || '%')
    )
  ORDER BY p.name ASC NULLS LAST, p.student_id ASC NULLS LAST
  OFFSET GREATEST(0, p_page) * GREATEST(1, p_page_size)
  LIMIT GREATEST(1, LEAST(p_page_size, 100));
$$;

CREATE INDEX IF NOT EXISTS idx_attendance_lecture_student
ON public.attendance(lecture_id, student_user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_status
ON public.attendance(status);
