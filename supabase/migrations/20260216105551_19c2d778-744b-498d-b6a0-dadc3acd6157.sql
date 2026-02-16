-- Performance indexes for enterprise-grade load times
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance (status);
CREATE INDEX IF NOT EXISTS idx_lectures_status ON public.lectures (status);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_log_changed_by ON public.attendance_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_log_changed_at ON public.attendance_audit_log (changed_at DESC);