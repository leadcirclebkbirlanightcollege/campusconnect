-- =============================
-- Retention RPC helpers (no frontend math)
-- =============================

CREATE OR REPLACE FUNCTION public.get_my_points_total()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(points), 0)::bigint
  FROM public.points_ledger
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_tier_progress(
  p_bronze_max integer DEFAULT 99,
  p_silver_max integer DEFAULT 249,
  p_gold_max integer DEFAULT 499
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH total AS (
    SELECT COALESCE(SUM(points), 0)::int AS points_total
    FROM public.points_ledger
    WHERE user_id = auth.uid()
  ),
  tier AS (
    SELECT
      points_total,
      CASE
        WHEN points_total <= p_bronze_max THEN 'bronze'
        WHEN points_total <= p_silver_max THEN 'silver'
        WHEN points_total <= p_gold_max THEN 'gold'
        ELSE 'elite'
      END AS points_tier
    FROM total
  ),
  next_goal AS (
    SELECT
      points_total,
      points_tier,
      CASE points_tier
        WHEN 'bronze' THEN p_bronze_max + 1
        WHEN 'silver' THEN p_silver_max + 1
        WHEN 'gold' THEN p_gold_max + 1
        ELSE NULL
      END AS next_threshold
    FROM tier
  )
  SELECT json_build_object(
    'points_total', points_total,
    'points_tier', points_tier,
    'next_threshold', next_threshold,
    'points_to_next', CASE
      WHEN next_threshold IS NULL THEN 0
      ELSE GREATEST(0, next_threshold - points_total)
    END,
    'progress_pct', CASE
      WHEN points_tier = 'bronze' THEN LEAST(100, ROUND((points_total::numeric / (p_bronze_max + 1)) * 100))
      WHEN points_tier = 'silver' THEN LEAST(100, ROUND(((points_total - (p_bronze_max + 1))::numeric / ((p_silver_max - p_bronze_max))::numeric) * 100))
      WHEN points_tier = 'gold' THEN LEAST(100, ROUND(((points_total - (p_silver_max + 1))::numeric / ((p_gold_max - p_silver_max))::numeric) * 100))
      ELSE 100
    END
  )
  FROM next_goal;
$$;

CREATE OR REPLACE FUNCTION public.get_my_streak()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'current_streak', COALESCE(s.current_streak, 0),
    'longest_streak', COALESCE(s.longest_streak, 0),
    'last_login_date', s.last_login_date,
    'updated_at', s.updated_at
  )
  FROM public.student_streaks s
  WHERE s.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_achievements(p_limit integer DEFAULT 20)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'code', a.code,
      'awarded_at', a.awarded_at,
      'metadata', a.metadata
    ) ORDER BY a.awarded_at DESC
  ), '[]'::json)
  FROM (
    SELECT *
    FROM public.student_achievements
    WHERE user_id = auth.uid()
    ORDER BY awarded_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 50))
  ) a;
$$;
