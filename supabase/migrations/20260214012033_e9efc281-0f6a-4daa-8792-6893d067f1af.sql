
-- 1. UNIQUE constraint on attendance (lecture_id, student_user_id) to prevent duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_lecture_student 
  ON public.attendance (lecture_id, student_user_id);

-- 2. Attendance summary RPC
CREATE OR REPLACE FUNCTION public.get_lecture_attendance_summary(p_lecture_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'present_count', (
      SELECT COUNT(DISTINCT student_user_id) 
      FROM public.attendance 
      WHERE lecture_id = p_lecture_id AND status = 'present'
    ),
    'total_students', (
      SELECT COUNT(DISTINCT spa.student_user_id)
      FROM public.student_programme_allotments spa
      JOIN public.lecture_programme_tags lpt ON lpt.programme_id = spa.programme_id
      WHERE lpt.lecture_id = p_lecture_id
    ),
    'attendance_percentage', (
      SELECT CASE 
        WHEN total.cnt = 0 THEN 0
        ELSE ROUND((present.cnt::numeric / total.cnt::numeric) * 100)
      END
      FROM 
        (SELECT COUNT(DISTINCT student_user_id) AS cnt FROM public.attendance WHERE lecture_id = p_lecture_id AND status = 'present') present,
        (SELECT GREATEST(1, COUNT(DISTINCT spa.student_user_id)) AS cnt 
         FROM public.student_programme_allotments spa 
         JOIN public.lecture_programme_tags lpt ON lpt.programme_id = spa.programme_id 
         WHERE lpt.lecture_id = p_lecture_id) total
    )
  );
$$;

-- 3. Student intelligence table
CREATE TABLE IF NOT EXISTS public.student_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  attendance_consistency integer NOT NULL DEFAULT 0,
  behaviour_reliability integer NOT NULL DEFAULT 0,
  engagement_index integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  risk_flags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own intelligence" ON public.student_intelligence
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "System can upsert intelligence" ON public.student_intelligence
  FOR ALL USING (is_admin(auth.uid()));

-- Allow service role inserts (edge function)
CREATE POLICY "Service insert intelligence" ON public.student_intelligence
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update intelligence" ON public.student_intelligence
  FOR UPDATE USING (true);

-- 4. Student flags table
CREATE TABLE IF NOT EXISTS public.student_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.student_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own flags" ON public.student_flags
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "System can manage flags" ON public.student_flags
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service insert flags" ON public.student_flags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update flags" ON public.student_flags
  FOR UPDATE USING (true);

-- 5. Poll votes unique constraint (one vote per user per poll)
CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_votes_user_poll 
  ON public.poll_votes (poll_id, user_id);

-- 6. Enable realtime for intelligence
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_intelligence;
