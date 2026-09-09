-- Migration: 20260908070000_welcome_email_tracking.sql
-- Description: Adds welcome_email_sent_at tracking to profiles and creates welcome_email_logs table

-- 1. Add welcome_email_sent_at to profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamp with time zone DEFAULT NULL;

-- 2. Create welcome_email_logs table for server-side idempotency and delivery diagnostics
CREATE TABLE IF NOT EXISTS public.welcome_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT welcome_email_logs_user_id_key UNIQUE (user_id)
);

-- 3. Enable RLS on welcome_email_logs
ALTER TABLE public.welcome_email_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Users can view their own log, admins can view all
DROP POLICY IF EXISTS "Users can view own welcome email log" ON public.welcome_email_logs;
CREATE POLICY "Users can view own welcome email log"
  ON public.welcome_email_logs FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- 5. Update profiles_guard_protected_fields to ensure non-admins cannot tamper with welcome_email_sent_at
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Force protected fields to OLD values for non-admin callers
  NEW.college_id             := OLD.college_id;
  NEW.approval_status        := OLD.approval_status;
  NEW.college_assigned       := OLD.college_assigned;
  NEW.approved_by            := OLD.approved_by;
  NEW.approved_at            := OLD.approved_at;
  NEW.rejection_reason       := OLD.rejection_reason;
  NEW.is_verified            := OLD.is_verified;
  NEW.is_core_member         := OLD.is_core_member;
  NEW.welcome_email_sent_at  := OLD.welcome_email_sent_at;
  RETURN NEW;
END;
$$;
