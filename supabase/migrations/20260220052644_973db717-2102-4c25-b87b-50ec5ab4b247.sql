
-- 1. UNIQUE CONSTRAINTS (idempotent with IF NOT EXISTS approach)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_lecture_student_unique'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_lecture_student_unique UNIQUE (lecture_id, student_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_rewards_log_user_date_unique'
  ) THEN
    ALTER TABLE public.daily_rewards_log
      ADD CONSTRAINT daily_rewards_log_user_date_unique UNIQUE (user_id, reward_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_achievements_user_code_unique'
  ) THEN
    ALTER TABLE public.student_achievements
      ADD CONSTRAINT student_achievements_user_code_unique UNIQUE (user_id, code);
  END IF;
END $$;

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_lecture_marked
  ON public.attendance (lecture_id, marked_at);

CREATE INDEX IF NOT EXISTS idx_attendance_student_marked
  ON public.attendance (student_user_id, marked_at);

CREATE INDEX IF NOT EXISTS idx_student_streaks_user
  ON public.student_streaks (user_id);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date
  ON public.daily_rewards_log (user_id, reward_date);

CREATE INDEX IF NOT EXISTS idx_student_intelligence_user
  ON public.student_intelligence (user_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_created
  ON public.points_ledger (user_id, created_at);

-- 3. GROWTH INSIGHTS RPC
CREATE OR REPLACE FUNCTION public.get_growth_insights(p_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH target_user AS (
    SELECT COALESCE(p_user_id, auth.uid()) AS uid
  ),
  -- Last 30 days lectures
  recent_lectures AS (
    SELECT l.id
    FROM lectures l
    WHERE l.lecture_date >= (CURRENT_DATE - INTERVAL '30 days')
      AND l.lecture_date <= CURRENT_DATE
  ),
  lecture_count AS (
    SELECT COUNT(*)::int AS cnt FROM recent_lectures
  ),
  attended AS (
    SELECT COUNT(*)::int AS cnt
    FROM attendance a
    JOIN recent_lectures rl ON rl.id = a.lecture_id
    CROSS JOIN target_user tu
    WHERE a.student_user_id = tu.uid
      AND a.status = 'present'
  ),
  pct AS (
    SELECT
      CASE WHEN lc.cnt = 0 THEN 0
        ELSE ROUND((att.cnt::numeric / lc.cnt) * 100, 1)
      END AS last_30_day_attendance_pct,
      att.cnt AS attended_count,
      lc.cnt AS total_count
    FROM lecture_count lc, attended att
  ),
  -- Points total for tier projection
  pts AS (
    SELECT COALESCE(SUM(points), 0)::int AS points_total
    FROM points_ledger
    CROSS JOIN target_user tu
    WHERE user_id = tu.uid
  ),
  -- Monthly points rate (last 30 days)
  monthly_pts AS (
    SELECT COALESCE(SUM(points), 0)::int AS recent_points
    FROM points_ledger
    CROSS JOIN target_user tu
    WHERE user_id = tu.uid
      AND created_at >= (CURRENT_DATE - INTERVAL '30 days')
  ),
  projection AS (
    SELECT
      pts.points_total,
      pts.points_total + mp.recent_points AS projected_points_next_month,
      CASE
        WHEN (pts.points_total + mp.recent_points) > 499 THEN 'elite'
        WHEN (pts.points_total + mp.recent_points) > 249 THEN 'gold'
        WHEN (pts.points_total + mp.recent_points) > 99 THEN 'silver'
        ELSE 'bronze'
      END AS projected_tier_next_month
    FROM pts, monthly_pts mp
  ),
  -- Trend: compare last 15 days vs previous 15 days
  trend AS (
    SELECT
      COUNT(*) FILTER (
        WHERE a.marked_at::date >= (CURRENT_DATE - INTERVAL '15 days') AND a.status = 'present'
      )::int AS recent_half,
      COUNT(*) FILTER (
        WHERE a.marked_at::date < (CURRENT_DATE - INTERVAL '15 days')
          AND a.marked_at::date >= (CURRENT_DATE - INTERVAL '30 days')
          AND a.status = 'present'
      )::int AS earlier_half
    FROM attendance a
    CROSS JOIN target_user tu
    JOIN recent_lectures rl ON rl.id = a.lecture_id
    WHERE a.student_user_id = tu.uid
  ),
  risk AS (
    SELECT
      CASE
        WHEN p.last_30_day_attendance_pct < 40 THEN 'high'
        WHEN p.last_30_day_attendance_pct < 60 THEN 'medium'
        ELSE 'low'
      END AS risk_probability
    FROM pct p
  )
  SELECT json_build_object(
    'last_30_day_attendance_pct', p.last_30_day_attendance_pct,
    'attended_count', p.attended_count,
    'total_lectures', p.total_count,
    'projected_tier_next_month', proj.projected_tier_next_month,
    'projected_points', proj.projected_points_next_month,
    'risk_probability', r.risk_probability,
    'trend_direction', CASE
      WHEN t.recent_half > t.earlier_half THEN 'improving'
      WHEN t.recent_half < t.earlier_half THEN 'declining'
      ELSE 'stable'
    END
  )
  FROM pct p, projection proj, trend t, risk r;
$$;

-- 4. WEEKLY LEADERBOARD RPC
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, name text, avatar_url text, is_verified boolean, weekly_points bigint, rank bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH week_start AS (
    SELECT DATE_TRUNC('week', CURRENT_DATE)::date AS ws
  ),
  weekly_totals AS (
    SELECT
      pl.user_id,
      COALESCE(SUM(pl.points), 0)::bigint AS weekly_points
    FROM public.points_ledger pl, week_start w
    WHERE pl.created_at >= w.ws::timestamptz
    GROUP BY pl.user_id
  )
  SELECT
    p.user_id,
    p.name,
    p.avatar_url,
    p.is_verified,
    COALESCE(wt.weekly_points, 0)::bigint AS weekly_points,
    ROW_NUMBER() OVER (ORDER BY COALESCE(wt.weekly_points, 0) DESC, p.name ASC)::bigint AS rank
  FROM public.profiles p
  LEFT JOIN weekly_totals wt ON wt.user_id = p.user_id
  WHERE p.is_deleted = false
    AND COALESCE(wt.weekly_points, 0) > 0
  ORDER BY COALESCE(wt.weekly_points, 0) DESC, p.name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;
