-- ============================================================
-- Migration: 20260906000000_stall_registration_whatsapp_redesign.sql
-- Description:
-- 1. Add whatsapp_group_link and full_flyer_url to events
-- 2. Expand stall_registrations to support team structure:
--    - Team Lead (name, class)
--    - Member 2 (name, class)
--    - Member 3 (name, class)
--    - Member 4 (name, class)
--    - Gender, phone, selling_description, extra_requirements, suggestion
-- 3. Make legacy fields nullable to avoid insert crashes
-- 4. Enable public/student registration with duplicate submission prevention
-- ============================================================

-- 1. Events columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS whatsapp_group_link text,
  ADD COLUMN IF NOT EXISTS full_flyer_url text;

-- 2. Relax legacy NOT NULL constraints on stall_registrations
ALTER TABLE public.stall_registrations
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN stall_name DROP NOT NULL,
  ALTER COLUMN contact_name DROP NOT NULL,
  ALTER COLUMN contact_email DROP NOT NULL,
  ALTER COLUMN type DROP NOT NULL;

-- 3. Add structured fields to stall_registrations
ALTER TABLE public.stall_registrations
  ADD COLUMN IF NOT EXISTS team_lead_name text,
  ADD COLUMN IF NOT EXISTS team_lead_class text,
  ADD COLUMN IF NOT EXISTS member_2_name text,
  ADD COLUMN IF NOT EXISTS member_2_class text,
  ADD COLUMN IF NOT EXISTS member_3_name text,
  ADD COLUMN IF NOT EXISTS member_3_class text,
  ADD COLUMN IF NOT EXISTS member_4_name text,
  ADD COLUMN IF NOT EXISTS member_4_class text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS selling_description text,
  ADD COLUMN IF NOT EXISTS extra_requirements text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS suggestion text;

-- 4. Duplicate prevention indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_stall_reg_event_phone
  ON public.stall_registrations(event_id, phone)
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stall_reg_event_user
  ON public.stall_registrations(event_id, user_id)
  WHERE user_id IS NOT NULL;

-- 5. Safe guard trigger update (handles null auth.uid() cleanly)
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

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NOT COALESCE(public.is_admin(auth.uid()), false) THEN
      NEW.status := 'pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    END IF;
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

-- 6. Update RLS policies
DROP POLICY IF EXISTS "Users can create own stall registration" ON public.stall_registrations;
DROP POLICY IF EXISTS "Anyone can create stall registration" ON public.stall_registrations;

CREATE POLICY "Anyone can create stall registration"
  ON public.stall_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    auth.uid() IS NULL OR user_id IS NULL OR auth.uid() = user_id
  );
