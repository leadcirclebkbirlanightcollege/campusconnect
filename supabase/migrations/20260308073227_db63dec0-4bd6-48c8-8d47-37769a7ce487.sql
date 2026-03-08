-- PHASE 13: Production RLS & Permission Fixes

-- 1. poll_votes: students need to see ALL votes (not just their own)
--    to render poll result bars and percentages
DROP POLICY IF EXISTS "poll_votes_select" ON public.poll_votes;

CREATE POLICY "Active users can view all poll votes"
  ON public.poll_votes
  FOR SELECT
  USING (is_active_user(auth.uid()));

-- 2. login_activity: allow users to INSERT their own login record
DROP POLICY IF EXISTS "Users can insert own login activity" ON public.login_activity;
CREATE POLICY "Users can insert own login activity"
  ON public.login_activity
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. security_alerts: allow admins to INSERT alerts
DROP POLICY IF EXISTS "Admins can insert security alerts" ON public.security_alerts;
CREATE POLICY "Admins can insert security alerts"
  ON public.security_alerts
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- 4. audit_logs: allow admins to INSERT log entries directly
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));