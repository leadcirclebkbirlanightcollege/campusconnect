-- Phase 12: Performance composite indexes for high-traffic queries

-- Attendance: fast lookups by student + status + time
CREATE INDEX IF NOT EXISTS idx_attendance_student_status
  ON public.attendance (student_user_id, status, marked_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_lecture_status
  ON public.attendance (lecture_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_college_time
  ON public.attendance (college_id, marked_at DESC);

-- Points ledger: fast per-user aggregation + timeline
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_time
  ON public.points_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_ledger_college_source
  ON public.points_ledger (college_id, source, created_at DESC);

-- Lectures: fast filtering by status + date
CREATE INDEX IF NOT EXISTS idx_lectures_status_date
  ON public.lectures (status, lecture_date DESC);

CREATE INDEX IF NOT EXISTS idx_lectures_college_date
  ON public.lectures (college_id, lecture_date DESC, status);

-- Profiles: fast active-user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_college_active
  ON public.profiles (college_id, is_deleted)
  WHERE is_deleted = false;

-- Notifications: fast unread count per user (partial index — only unread rows)
CREATE INDEX IF NOT EXISTS idx_notif_recipients_user_unread
  ON public.notification_recipients (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Audit logs: fast admin timeline queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_college_time
  ON public.audit_logs (college_id, created_at DESC);

-- Daily checkins: fast today-check per user
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON public.daily_checkins (user_id, checkin_date DESC);

-- Student intelligence: fast risk queries
CREATE INDEX IF NOT EXISTS idx_student_intel_risk
  ON public.student_intelligence (attendance_consistency, engagement_index);

-- Login activity: fast admin login timeline
CREATE INDEX IF NOT EXISTS idx_login_activity_user_time
  ON public.login_activity (user_id, created_at DESC);
