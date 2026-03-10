
-- ══════════════════════════════════════════════════════════════
-- CAMPUS CONNECT — MULTI-TENANT ARCHITECTURE MIGRATION
-- Adds: departments, classes tables + strengthened college RLS
-- ══════════════════════════════════════════════════════════════

-- ─── 1. DEPARTMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id  UUID        NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(college_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_college ON public.departments(college_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Active users can view departments in their college"
  ON public.departments FOR SELECT
  TO public
  USING (
    is_active = true AND (
      is_active_user(auth.uid()) OR is_admin(auth.uid())
    )
  );

-- ─── 2. CLASSES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classes (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id    UUID        NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  department_id UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  name          TEXT        NOT NULL,
  year          INTEGER,
  section       TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_by    UUID,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(college_id, name, section)
);

CREATE INDEX IF NOT EXISTS idx_classes_college     ON public.classes(college_id);
CREATE INDEX IF NOT EXISTS idx_classes_department  ON public.classes(department_id);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage classes"
  ON public.classes FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Active users can view classes"
  ON public.classes FOR SELECT
  TO public
  USING (
    is_active = true AND (
      is_active_user(auth.uid()) OR is_admin(auth.uid())
    )
  );

-- ─── 3. UPDATED-AT TRIGGERS ─────────────────────────────────
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 4. TENANT CONTEXT HELPER FUNCTION ──────────────────────
CREATE OR REPLACE FUNCTION public.get_my_college_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT college_id FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ─── 5. PERFORMANCE INDEXES ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_college_id   ON public.attendance(college_id);
CREATE INDEX IF NOT EXISTS idx_lectures_college_id     ON public.lectures(college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_college_id     ON public.profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_college   ON public.points_ledger(college_id);
CREATE INDEX IF NOT EXISTS idx_challenges_college      ON public.challenges(college_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_college      ON public.audit_logs(college_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_college ON public.security_alerts(college_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_college  ON public.login_activity(college_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_college  ON public.daily_checkins(college_id);
CREATE INDEX IF NOT EXISTS idx_feedback_college        ON public.feedback(college_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_college      ON public.user_roles(college_id);
CREATE INDEX IF NOT EXISTS idx_core_team_college       ON public.core_team_members(college_id);

-- Composite indexes for high-traffic analytical queries
CREATE INDEX IF NOT EXISTS idx_attendance_college_student
  ON public.attendance(college_id, student_user_id, marked_at DESC);

CREATE INDEX IF NOT EXISTS idx_lectures_college_date
  ON public.lectures(college_id, lecture_date DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_college_active
  ON public.profiles(college_id, is_deleted) WHERE is_deleted = false;
