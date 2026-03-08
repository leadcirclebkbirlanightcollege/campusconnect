
-- ═══════════════════════════════════════════════════════════
-- FIX 1: profiles — anon PII leak
-- Drop overly-permissive SELECT, replace with scoped policy
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Profiles are viewable by active users" ON public.profiles;
DROP POLICY IF EXISTS "Active users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

-- Students view only their own profile; admins/super_admin see all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- FIX 2: points_ledger — privilege escalation
-- Remove ALL client INSERT policies — only service-role may write
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Service role can insert points" ON public.points_ledger;
DROP POLICY IF EXISTS "Users can insert their own points" ON public.points_ledger;
DROP POLICY IF EXISTS "Allow attendance points insertion" ON public.points_ledger;
DROP POLICY IF EXISTS "System can insert points" ON public.points_ledger;
DROP POLICY IF EXISTS "points_insert_service" ON public.points_ledger;

-- Clean up any remaining INSERT policies dynamically
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'points_ledger' AND schemaname = 'public' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.points_ledger', pol.policyname);
  END LOOP;
END $$;

-- Clean up existing SELECT policies and replace
DROP POLICY IF EXISTS "Users can view their own points" ON public.points_ledger;
DROP POLICY IF EXISTS "Admins can view college points" ON public.points_ledger;
DROP POLICY IF EXISTS "points_ledger_select" ON public.points_ledger;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'points_ledger' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.points_ledger', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "points_ledger_select" ON public.points_ledger
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- FIX 3: poll_votes — anonymous poll voter identity leak
-- Students only see their own votes; admins see all
-- ═══════════════════════════════════════════════════════════
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'poll_votes' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.poll_votes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "poll_votes_select" ON public.poll_votes
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );
