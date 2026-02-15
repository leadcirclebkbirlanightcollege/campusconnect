
-- Combined monthly export RPC: returns all students grouped by programme/class with attendance + intelligence
CREATE OR REPLACE FUNCTION public.export_monthly_attendance_combined(
  p_start_date date,
  p_end_date date,
  p_programme_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  -- Lectures in range
  range_lectures AS (
    SELECT l.id
    FROM lectures l
    WHERE l.lecture_date >= p_start_date
      AND l.lecture_date < p_end_date
  ),
  lecture_count AS (
    SELECT COUNT(*)::int AS cnt FROM range_lectures
  ),
  -- Students with optional programme filter
  student_set AS (
    SELECT DISTINCT p.user_id, p.name, p.student_id, p.class_name,
           COALESCE(pr.name, 'Unassigned') AS programme_name
    FROM profiles p
    LEFT JOIN student_programme_allotments spa ON spa.student_user_id = p.user_id
    LEFT JOIN programmes pr ON pr.id = spa.programme_id AND pr.is_active = true
    WHERE p.is_deleted = false
      AND (p_programme_id IS NULL OR spa.programme_id = p_programme_id)
  ),
  -- Attendance counts per student in range
  att_counts AS (
    SELECT a.student_user_id,
           COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count
    FROM attendance a
    JOIN range_lectures rl ON rl.id = a.lecture_id
    GROUP BY a.student_user_id
  ),
  -- Intelligence
  intel AS (
    SELECT si.user_id, si.tier, si.attendance_consistency, si.behaviour_reliability,
           si.engagement_index, si.risk_flags
    FROM student_intelligence si
  ),
  -- Combine
  combined AS (
    SELECT s.programme_name,
           COALESCE(s.class_name, 'N/A') AS class_name,
           s.name AS student_name,
           s.student_id,
           COALESCE(ac.present_count, 0) AS present_count,
           lc.cnt AS total_lectures,
           CASE WHEN lc.cnt > 0 THEN ROUND((COALESCE(ac.present_count,0)::numeric / lc.cnt) * 100, 1) ELSE 0 END AS attendance_pct,
           COALESCE(i.tier, 'bronze') AS tier,
           COALESCE(i.attendance_consistency, 0) AS ac_score,
           COALESCE(i.behaviour_reliability, 0) AS br_score,
           COALESCE(i.engagement_index, 0) AS ei_score,
           COALESCE(i.risk_flags, '{}') AS risk_flags
    FROM student_set s
    CROSS JOIN lecture_count lc
    LEFT JOIN att_counts ac ON ac.student_user_id = s.user_id
    LEFT JOIN intel i ON i.user_id = s.user_id
  ),
  -- Summary stats
  summary AS (
    SELECT json_build_object(
      'total_students', (SELECT COUNT(*) FROM combined),
      'total_lectures', (SELECT MAX(total_lectures) FROM combined),
      'total_present_marks', (SELECT COALESCE(SUM(present_count),0) FROM combined),
      'avg_attendance_pct', (SELECT COALESCE(ROUND(AVG(attendance_pct)::numeric, 1), 0) FROM combined),
      'risk_count', (SELECT COUNT(*) FROM combined WHERE array_length(risk_flags::text[], 1) > 0),
      'top_performer', (SELECT student_name FROM combined ORDER BY attendance_pct DESC, student_name ASC LIMIT 1),
      'avg_intelligence', (SELECT COALESCE(ROUND(AVG((ac_score + br_score + ei_score)::numeric / 3), 1), 0) FROM combined)
    ) AS val
  )
  SELECT json_build_object(
    'summary', (SELECT val FROM summary),
    'rows', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'programme', c.programme_name,
          'class', c.class_name,
          'name', c.student_name,
          'student_id', c.student_id,
          'present', c.present_count,
          'total_lectures', c.total_lectures,
          'attendance_pct', c.attendance_pct,
          'tier', c.tier,
          'risk_flags', c.risk_flags
        ) ORDER BY c.programme_name, c.class_name, c.student_name
      ), '[]'::json)
      FROM combined c
    )
  );
$$;
