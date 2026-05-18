-- Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_year integer,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS graduation_status text NOT NULL DEFAULT 'active';

-- Class promotion rules
CREATE TABLE IF NOT EXISTS public.class_promotion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  from_class text NOT NULL,
  to_class text,
  graduates boolean NOT NULL DEFAULT false,
  next_year integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, from_class)
);

ALTER TABLE public.class_promotion_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotion_rules_admin_manage" ON public.class_promotion_rules;
CREATE POLICY "promotion_rules_admin_manage" ON public.class_promotion_rules
  FOR ALL
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "promotion_rules_read" ON public.class_promotion_rules;
CREATE POLICY "promotion_rules_read" ON public.class_promotion_rules
  FOR SELECT
  USING (public.is_active_user(auth.uid()));

CREATE TRIGGER class_promotion_rules_set_updated
  BEFORE UPDATE ON public.class_promotion_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Promotion runs (audit + undo log)
CREATE TABLE IF NOT EXISTS public.academic_promotion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  performed_by uuid NOT NULL,
  from_session text,
  to_session text NOT NULL,
  total_promoted integer NOT NULL DEFAULT 0,
  total_graduated integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reversed_at timestamptz,
  reversed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_promotion_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotion_runs_admin_select" ON public.academic_promotion_runs;
CREATE POLICY "promotion_runs_admin_select" ON public.academic_promotion_runs
  FOR SELECT
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "promotion_runs_admin_insert" ON public.academic_promotion_runs;
CREATE POLICY "promotion_runs_admin_insert" ON public.academic_promotion_runs
  FOR INSERT
  WITH CHECK ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "promotion_runs_admin_update" ON public.academic_promotion_runs;
CREATE POLICY "promotion_runs_admin_update" ON public.academic_promotion_runs
  FOR UPDATE
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_promotion_runs_college ON public.academic_promotion_runs(college_id, created_at DESC);