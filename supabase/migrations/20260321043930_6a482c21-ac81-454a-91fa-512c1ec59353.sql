
-- Assignments table
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  attachment_url text,
  attachment_name text,
  max_marks integer DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and faculty can manage assignments"
  ON public.assignments FOR ALL
  USING (is_admin(auth.uid()) OR is_faculty(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE POLICY "Students can view assignments"
  ON public.assignments FOR SELECT
  USING (is_active_user(auth.uid()) AND is_active = true);

-- Submissions table
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL,
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  content text,
  attachment_url text,
  attachment_name text,
  status text NOT NULL DEFAULT 'submitted',
  marks_obtained integer,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_user_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own submissions"
  ON public.submissions FOR ALL
  USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

CREATE POLICY "Faculty and admins can view submissions"
  ON public.submissions FOR SELECT
  USING (is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE POLICY "Faculty and admins can update submissions"
  ON public.submissions FOR UPDATE
  USING (is_admin(auth.uid()) OR is_faculty(auth.uid()));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view assignment files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload assignment files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assignments' AND auth.role() = 'authenticated');

CREATE POLICY "Students can upload submission files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own submission files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Faculty can view submission files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions' AND (is_admin(auth.uid()) OR is_faculty(auth.uid())));

-- Triggers
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Faculty analytics RPC
CREATE OR REPLACE FUNCTION public.get_faculty_lecture_analytics(p_faculty_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH fac AS (
    SELECT COALESCE(p_faculty_id, auth.uid()) AS uid
  ),
  lecs AS (
    SELECT l.id, l.topic, l.lecture_date, l.status
    FROM lectures l, fac f
    WHERE l.created_by = f.uid
    ORDER BY l.lecture_date DESC
  ),
  att_per_lec AS (
    SELECT a.lecture_id,
           COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count
    FROM attendance a
    WHERE a.lecture_id IN (SELECT id FROM lecs)
    GROUP BY a.lecture_id
  )
  SELECT json_build_object(
    'total_lectures', (SELECT COUNT(*) FROM lecs),
    'completed_lectures', (SELECT COUNT(*) FROM lecs WHERE status = 'ended'),
    'live_lectures', (SELECT COUNT(*) FROM lecs WHERE status = 'live'),
    'avg_attendance', COALESCE((SELECT ROUND(AVG(present_count)) FROM att_per_lec), 0),
    'total_attendance_marks', COALESCE((SELECT SUM(present_count) FROM att_per_lec), 0),
    'recent_lectures', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', l.id, 'topic', l.topic, 'lecture_date', l.lecture_date,
          'status', l.status, 'present_count', COALESCE(ap.present_count, 0)
        ) ORDER BY l.lecture_date DESC
      ), '[]')
      FROM lecs l LEFT JOIN att_per_lec ap ON ap.lecture_id = l.id
      LIMIT 10
    )
  );
$$;

-- Admin college analytics RPC
CREATE OR REPLACE FUNCTION public.get_admin_college_analytics()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH col AS (
    SELECT get_my_college_id() AS cid
  ),
  students AS (
    SELECT COUNT(*)::int AS cnt
    FROM user_roles ur, col c
    WHERE ur.role = 'student' AND ur.college_id = c.cid
  ),
  faculty_count AS (
    SELECT COUNT(*)::int AS cnt
    FROM user_roles ur, col c
    WHERE ur.role = 'faculty' AND ur.college_id = c.cid
  ),
  lec_count AS (
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'live')::int AS live_count
    FROM lectures l, col c
    WHERE l.college_id = c.cid
  ),
  att_today AS (
    SELECT COUNT(*)::int AS cnt
    FROM attendance a
    JOIN lectures l ON l.id = a.lecture_id
    CROSS JOIN col c
    WHERE l.college_id = c.cid
      AND a.marked_at >= CURRENT_DATE::timestamptz
  ),
  risk_count AS (
    SELECT COUNT(*)::int AS cnt
    FROM student_intelligence si
    JOIN user_roles ur ON ur.user_id = si.user_id
    CROSS JOIN col c
    WHERE ur.college_id = c.cid
      AND si.attendance_consistency < 60
  ),
  avg_att AS (
    SELECT COALESCE(ROUND(AVG(si.attendance_consistency))::int, 0) AS avg_pct
    FROM student_intelligence si
    JOIN user_roles ur ON ur.user_id = si.user_id
    CROSS JOIN col c
    WHERE ur.college_id = c.cid
  ),
  tier_dist AS (
    SELECT
      COUNT(*) FILTER (WHERE si.tier = 'elite')::int AS elite,
      COUNT(*) FILTER (WHERE si.tier = 'gold')::int AS gold,
      COUNT(*) FILTER (WHERE si.tier = 'silver')::int AS silver,
      COUNT(*) FILTER (WHERE si.tier = 'bronze')::int AS bronze
    FROM student_intelligence si
    JOIN user_roles ur ON ur.user_id = si.user_id
    CROSS JOIN col c
    WHERE ur.college_id = c.cid
  )
  SELECT json_build_object(
    'total_students', (SELECT cnt FROM students),
    'total_faculty', (SELECT cnt FROM faculty_count),
    'total_lectures', (SELECT total FROM lec_count),
    'live_lectures', (SELECT live_count FROM lec_count),
    'attendance_today', (SELECT cnt FROM att_today),
    'at_risk_count', (SELECT cnt FROM risk_count),
    'avg_attendance_pct', (SELECT avg_pct FROM avg_att),
    'tier_distribution', (SELECT row_to_json(t) FROM tier_dist t)
  );
$$;
