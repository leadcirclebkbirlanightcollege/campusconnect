CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit integer DEFAULT 50,
  p_verified_only boolean DEFAULT false
)
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  is_verified boolean,
  points_total bigint,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH totals AS (
    SELECT
      pl.user_id,
      COALESCE(SUM(pl.points), 0)::bigint AS points_total
    FROM public.points_ledger pl
    GROUP BY pl.user_id
  )
  SELECT
    p.user_id,
    p.name,
    p.avatar_url,
    p.is_verified,
    COALESCE(t.points_total, 0)::bigint AS points_total,
    ROW_NUMBER() OVER (ORDER BY COALESCE(t.points_total, 0) DESC, p.name ASC)::bigint AS rank
  FROM public.profiles p
  LEFT JOIN totals t ON t.user_id = p.user_id
  WHERE p.is_deleted = false
    AND (NOT p_verified_only OR p.is_verified = true)
  ORDER BY COALESCE(t.points_total, 0) DESC, p.name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;