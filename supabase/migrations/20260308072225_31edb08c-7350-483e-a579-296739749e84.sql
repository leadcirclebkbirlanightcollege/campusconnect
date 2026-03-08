
-- ═══════════════════════════════════════════════════════════
-- Generic audit_logs table
-- Captures all critical platform actions for traceability
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL,
  performed_by  uuid NOT NULL,
  target_entity text NOT NULL,
  target_id     text,
  college_id    uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  details       jsonb DEFAULT '{}'::jsonb,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins see all; college admins see their own college's logs
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.is_admin(auth.uid()));

-- Only server-side (service_role) may insert — no client writes
-- (no INSERT policy = only service_role bypasses RLS)

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_college_id ON public.audit_logs(college_id) WHERE college_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- login_activity table — track sign-ins for anomaly detection
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.login_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  user_agent  text,
  ip_address  text,
  college_id  uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_activity_select" ON public.login_activity
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON public.login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON public.login_activity(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- security_alerts table — flag suspicious behaviour
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type    text NOT NULL,
  user_id       uuid,
  college_id    uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  details       jsonb DEFAULT '{}'::jsonb,
  resolved      boolean NOT NULL DEFAULT false,
  resolved_at   timestamptz,
  resolved_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_alerts_select" ON public.security_alerts
  FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON public.security_alerts(resolved) WHERE resolved = false;
