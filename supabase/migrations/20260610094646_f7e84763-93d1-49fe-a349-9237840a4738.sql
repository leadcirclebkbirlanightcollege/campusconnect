CREATE OR REPLACE FUNCTION public.get_class_leaderboard(p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, name text, avatar_url text, is_verified boolean, points_total bigint, rank bigint, class_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT class_id, class_name, college_id
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  ),
  totals AS (
    SELECT pl.user_id, COALESCE(SUM(pl.points), 0)::bigint AS points_total
    FROM public.points_ledger pl
    GROUP BY pl.user_id
  )
  SELECT
    p.user_id,
    p.name,
    p.avatar_url,
    p.is_verified,
    COALESCE(t.points_total, 0)::bigint AS points_total,
    ROW_NUMBER() OVER (ORDER BY COALESCE(t.points_total, 0) DESC, p.name ASC)::bigint AS rank,
    p.class_name
  FROM public.profiles p
  LEFT JOIN totals t ON t.user_id = p.user_id
  CROSS JOIN me
  WHERE p.is_deleted = false
    AND me.class_id IS NOT NULL
    AND p.class_id = me.class_id
    AND p.college_id = me.college_id
  ORDER BY COALESCE(t.points_total, 0) DESC, p.name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$function$;

GRANT EXECUTE ON FUNCTION public.get_class_leaderboard(integer) TO authenticated;