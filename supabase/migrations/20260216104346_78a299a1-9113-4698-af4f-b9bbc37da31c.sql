
-- 1. Create attendance_audit_log table
CREATE TABLE public.attendance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid,
  lecture_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  old_status text,
  new_status text,
  changed_by uuid NOT NULL,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert audit logs"
ON public.attendance_audit_log FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs"
ON public.attendance_audit_log FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- No UPDATE or DELETE policies - immutable

-- 2. Add edited_by and edited_at to attendance
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS edited_by uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_lecture_student ON public.attendance (lecture_id, student_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_user_id);
CREATE INDEX IF NOT EXISTS idx_student_intelligence_user ON public.student_intelligence (user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_user ON public.poll_votes (poll_id, user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_student ON public.attendance_audit_log (student_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_lecture ON public.attendance_audit_log (lecture_id);
