
CREATE TABLE public.institution_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.institution_partners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.institution_partners TO authenticated;
GRANT ALL ON public.institution_partners TO service_role;

ALTER TABLE public.institution_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active partners"
  ON public.institution_partners FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert partners"
  ON public.institution_partners FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update partners"
  ON public.institution_partners FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete partners"
  ON public.institution_partners FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_institution_partners_updated_at
  BEFORE UPDATE ON public.institution_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_institution_partners_active_order
  ON public.institution_partners (is_active, display_order);

INSERT INTO public.institution_partners (name, logo_url, city, state, badge, is_active, display_order)
VALUES (
  'B. K. Birla Night Arts, Science & Commerce College',
  '/__l5e/assets-v1/a4a9e218-032b-46ce-a19d-cd8c48894caa/bkbnc-logo.png',
  'Kalyan',
  'Maharashtra',
  'Founding Institution Partner',
  true,
  0
);
