
-- ═══════════════════════════════════════════════════════════
-- Fix: notification_recipients self-insert — remove student INSERT
-- Only admins and system (service_role) should create recipients
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'notification_recipients' AND schemaname = 'public' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_recipients', pol.policyname);
  END LOOP;
END $$;

-- Only admins may insert; service_role bypasses RLS automatically
CREATE POLICY "notification_recipients_insert_admin" ON public.notification_recipients
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- Fix: also drop any remaining legacy points_ledger INSERT policies
-- that may have been recreated by a previous migration
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'points_ledger' AND schemaname = 'public' AND cmd IN ('INSERT','ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.points_ledger', pol.policyname);
  END LOOP;
END $$;
