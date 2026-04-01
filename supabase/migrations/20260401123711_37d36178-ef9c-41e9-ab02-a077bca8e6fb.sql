
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  college text NOT NULL,
  phone text,
  email text,
  city text,
  student_count text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage leads" ON public.leads
  FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view leads" ON public.leads
  FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT TO public
  WITH CHECK (true);
