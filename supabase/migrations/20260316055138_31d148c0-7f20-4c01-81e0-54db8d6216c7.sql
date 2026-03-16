
-- Upgrade get_platform_analytics to include today's stats, admin count, and live lecture count
-- This consolidates 6 separate dashboard queries into one RPC call

CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_colleges',       (SELECT COUNT(*) FROM public.colleges),
    'active_colleges',      (SELECT COUNT(*) FROM public.colleges WHERE is_active = true),
    'total_students',       (SELECT COUNT(*) FROM public.profiles WHERE is_deleted = false),
    'total_lectures',       (SELECT COUNT(*) FROM public.lectures),
    'total_attendance',     (SELECT COUNT(*) FROM public.attendance),
    'total_points_awarded', (SELECT COALESCE(SUM(points), 0) FROM public.points_ledger),
    'total_admins',         (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin'),
    'live_lectures',        (SELECT COUNT(*) FROM public.lectures WHERE status = 'live'),
    'attendance_today',     (SELECT COUNT(*) FROM public.attendance WHERE marked_at >= CURRENT_DATE::timestamptz),
    'security_alerts_open', (SELECT COUNT(*) FROM public.security_alerts WHERE resolved = false),
    'active_sessions_15m',  (SELECT COUNT(*) FROM public.login_activity WHERE created_at >= NOW() - INTERVAL '15 minutes')
  );
$$;

-- Performance indexes for high-traffic queries
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at ON public.attendance(marked_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON public.login_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_college_active ON public.profiles(college_id, is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_lectures_status_college ON public.lectures(status, college_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON public.security_alerts(resolved) WHERE resolved = false;
