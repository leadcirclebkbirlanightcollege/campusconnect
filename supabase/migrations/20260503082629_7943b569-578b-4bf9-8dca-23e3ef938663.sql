
-- ============================================================
-- 1. EVENTS TABLE: add new columns (non-breaking)
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS college_id uuid,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flyer_url text,
  ADD COLUMN IF NOT EXISTS max_stalls integer;

CREATE INDEX IF NOT EXISTS idx_events_college_featured
  ON public.events(college_id, is_featured, event_date DESC);

-- ============================================================
-- 2. POINT CLAIMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_activity_type AS ENUM ('event_attendance','participation','winning','idea_submission','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.point_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid,
  user_id uuid NOT NULL,
  activity_type public.claim_activity_type NOT NULL,
  points integer NOT NULL CHECK (points > 0 AND points <= 1000),
  description text,
  evidence_url text,
  event_id uuid,
  status public.claim_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_claims_user ON public.point_claims(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_claims_college_status ON public.point_claims(college_id, status, created_at DESC);

ALTER TABLE public.point_claims ENABLE ROW LEVEL SECURITY;

-- Auto-fill college_id from caller's user_roles on insert
CREATE OR REPLACE FUNCTION public.set_point_claim_college()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.college_id IS NULL THEN
    NEW.college_id := public.get_my_college_id();
  END IF;
  -- Force pending on insert by non-admins
  IF TG_OP = 'INSERT' AND NOT public.is_admin(auth.uid()) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_point_claims_set_college ON public.point_claims;
CREATE TRIGGER trg_point_claims_set_college
  BEFORE INSERT OR UPDATE ON public.point_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_point_claim_college();

-- Award points to ledger on approval
CREATE OR REPLACE FUNCTION public.point_claim_award_on_approve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND COALESCE(OLD.status, 'pending') <> 'approved' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
    INSERT INTO public.points_ledger(user_id, points, source, note, source_id, created_by, college_id)
    VALUES (
      NEW.user_id,
      NEW.points,
      'claim_' || NEW.activity_type::text,
      COALESCE(NEW.description, 'Approved point claim'),
      NEW.id,
      auth.uid(),
      NEW.college_id
    );
  ELSIF TG_OP = 'UPDATE'
     AND NEW.status = 'rejected'
     AND COALESCE(OLD.status, 'pending') <> 'rejected' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_point_claims_award ON public.point_claims;
CREATE TRIGGER trg_point_claims_award
  BEFORE UPDATE ON public.point_claims
  FOR EACH ROW EXECUTE FUNCTION public.point_claim_award_on_approve();

-- RLS
CREATE POLICY "Users can view own claims" ON public.point_claims
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view college claims" ON public.point_claims
  FOR SELECT USING (
    is_admin(auth.uid()) AND college_id = get_my_college_id()
  );

CREATE POLICY "Super admins can view all claims" ON public.point_claims
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can create own claims" ON public.point_claims
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND is_active_user(auth.uid())
  );

CREATE POLICY "Admins can update college claims" ON public.point_claims
  FOR UPDATE USING (
    is_admin(auth.uid()) AND college_id = get_my_college_id()
  ) WITH CHECK (
    is_admin(auth.uid()) AND college_id = get_my_college_id()
  );

CREATE POLICY "Admins can delete college claims" ON public.point_claims
  FOR DELETE USING (
    is_admin(auth.uid()) AND college_id = get_my_college_id()
  );

-- ============================================================
-- 3. STALL REGISTRATIONS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.stall_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stall_type AS ENUM ('food','game','startup','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.stall_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  stall_name text NOT NULL CHECK (length(trim(stall_name)) > 0),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  type public.stall_type NOT NULL DEFAULT 'other',
  description text,
  requirements text,
  status public.stall_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stall_event_status ON public.stall_registrations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_stall_college_status ON public.stall_registrations(college_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stall_user ON public.stall_registrations(user_id, created_at DESC);

ALTER TABLE public.stall_registrations ENABLE ROW LEVEL SECURITY;

-- Auto-fill college_id, enforce max_stalls on approval
CREATE OR REPLACE FUNCTION public.stall_registration_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_college uuid;
  v_max integer;
  v_approved_count integer;
BEGIN
  SELECT college_id, max_stalls INTO v_event_college, v_max
  FROM public.events WHERE id = NEW.event_id;

  IF NEW.college_id IS NULL THEN
    NEW.college_id := COALESCE(v_event_college, public.get_my_college_id());
  END IF;

  IF TG_OP = 'INSERT' AND NOT public.is_admin(auth.uid()) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  END IF;

  -- Enforce max stalls when approving
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND COALESCE(OLD.status,'pending') <> 'approved' THEN
    IF v_max IS NOT NULL THEN
      SELECT COUNT(*) INTO v_approved_count
        FROM public.stall_registrations
        WHERE event_id = NEW.event_id AND status = 'approved' AND id <> NEW.id;
      IF v_approved_count >= v_max THEN
        RAISE EXCEPTION 'max_stalls_reached: this event has reached its stall limit (%).', v_max;
      END IF;
    END IF;
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  ELSIF TG_OP = 'UPDATE'
     AND NEW.status = 'rejected'
     AND COALESCE(OLD.status,'pending') <> 'rejected' THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stall_guard ON public.stall_registrations;
CREATE TRIGGER trg_stall_guard
  BEFORE INSERT OR UPDATE ON public.stall_registrations
  FOR EACH ROW EXECUTE FUNCTION public.stall_registration_guard();

CREATE POLICY "Users can view own stalls" ON public.stall_registrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view college stalls" ON public.stall_registrations
  FOR SELECT USING (is_admin(auth.uid()) AND college_id = get_my_college_id());

CREATE POLICY "Super admins view all stalls" ON public.stall_registrations
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can create own stall registration" ON public.stall_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_active_user(auth.uid()));

CREATE POLICY "Admins can update college stalls" ON public.stall_registrations
  FOR UPDATE USING (is_admin(auth.uid()) AND college_id = get_my_college_id())
  WITH CHECK (is_admin(auth.uid()) AND college_id = get_my_college_id());

CREATE POLICY "Admins can delete college stalls" ON public.stall_registrations
  FOR DELETE USING (is_admin(auth.uid()) AND college_id = get_my_college_id());

CREATE POLICY "Users can cancel own pending stall" ON public.stall_registrations
  FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- ============================================================
-- 4. EVENTS RLS additions for college visibility (don't disturb existing)
-- ============================================================
-- existing policies remain; events RLS already enabled per app, but safe-guard:
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Helper RPC for an event's stall capacity status
CREATE OR REPLACE FUNCTION public.get_event_stall_summary(p_event_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'max_stalls', e.max_stalls,
    'approved_count', (SELECT COUNT(*) FROM public.stall_registrations s WHERE s.event_id = p_event_id AND s.status = 'approved'),
    'pending_count',  (SELECT COUNT(*) FROM public.stall_registrations s WHERE s.event_id = p_event_id AND s.status = 'pending'),
    'is_full', CASE
      WHEN e.max_stalls IS NULL THEN false
      ELSE (SELECT COUNT(*) FROM public.stall_registrations s WHERE s.event_id = p_event_id AND s.status = 'approved') >= e.max_stalls
    END
  )
  FROM public.events e WHERE e.id = p_event_id;
$$;
