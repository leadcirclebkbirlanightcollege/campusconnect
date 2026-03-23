-- ================================================================
-- CAMPUS CONNECT: Final Product Completion Migration
-- 1. Timetable slots table
-- 2. Documents management table
-- 3. Student status (lifecycle) field
-- 4. Exams & Results tables
-- ================================================================

-- ── 1. TIMETABLE SLOTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id            uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id    uuid    NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  class_id      uuid    REFERENCES public.classes(id) ON DELETE SET NULL,
  department_id uuid    REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by    uuid    NOT NULL,
  day_of_week   integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    time    NOT NULL,
  end_time      time    NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  subject       text    NOT NULL,
  venue         text,
  faculty_name  text
);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view timetable" ON public.timetable_slots
  FOR SELECT USING (is_active_user(auth.uid()));

CREATE POLICY "Admins can manage timetable" ON public.timetable_slots
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_timetable_college ON public.timetable_slots(college_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON public.timetable_slots(class_id);

-- ── 2. DOCUMENTS MANAGEMENT ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id   uuid    REFERENCES public.colleges(id) ON DELETE CASCADE,
  class_id     uuid    REFERENCES public.classes(id) ON DELETE SET NULL,
  uploaded_by  uuid    NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  title        text    NOT NULL,
  file_url     text    NOT NULL,
  file_name    text,
  file_size    bigint,
  doc_type     text    NOT NULL DEFAULT 'notes',
  subject      text,
  access_level text    NOT NULL DEFAULT 'students'
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view accessible documents" ON public.documents
  FOR SELECT USING (
    is_active = true AND is_active_user(auth.uid())
  );

CREATE POLICY "Faculty and admins can manage documents" ON public.documents
  FOR ALL USING (is_admin(auth.uid()) OR is_faculty(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_documents_college ON public.documents(college_id);
CREATE INDEX IF NOT EXISTS idx_documents_class ON public.documents(class_id);

-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- ── 3. STUDENT LIFECYCLE STATUS ───────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS graduation_year integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

-- ── 4. EXAMS & RESULTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id          uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id  uuid    REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_by  uuid    NOT NULL,
  exam_date   date    NOT NULL,
  max_marks   integer NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  title       text    NOT NULL,
  subject     text    NOT NULL,
  description text
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view exams" ON public.exams
  FOR SELECT USING (is_active_user(auth.uid()) AND is_active = true);

CREATE POLICY "Admins and faculty can manage exams" ON public.exams
  FOR ALL USING (is_admin(auth.uid()) OR is_faculty(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE TABLE IF NOT EXISTS public.exam_results (
  id               uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id          uuid    NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_user_id  uuid    NOT NULL,
  college_id       uuid    REFERENCES public.colleges(id) ON DELETE CASCADE,
  marks_obtained   numeric NOT NULL DEFAULT 0,
  grade            text,
  entered_by       uuid    NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  remarks          text,
  UNIQUE(exam_id, student_user_id)
);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own results" ON public.exam_results
  FOR SELECT USING ((student_user_id = auth.uid()) OR is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE POLICY "Admins and faculty can manage results" ON public.exam_results
  FOR ALL USING (is_admin(auth.uid()) OR is_faculty(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_faculty(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results(student_user_id);
CREATE INDEX IF NOT EXISTS idx_exams_college ON public.exams(college_id);