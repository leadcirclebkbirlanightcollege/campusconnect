
-- ── platform_branding ───────────────────────────────────────
CREATE TABLE public.platform_branding (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name  text NOT NULL DEFAULT 'Campus Connect',
  tagline     text NOT NULL DEFAULT 'By Students For Students',
  logo_url    text,
  favicon_url text,
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read branding"
  ON public.platform_branding FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage branding"
  ON public.platform_branding FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.platform_branding (brand_name, tagline)
VALUES ('Campus Connect', 'By Students For Students');

-- ── core_team_members ────────────────────────────────────────
CREATE TABLE public.core_team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  class       text,
  designation text,
  photo_url   text,
  order_index integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.core_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read team members"
  ON public.core_team_members FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage team members"
  ON public.core_team_members FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── storage bucket for team photos ──────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Team photos publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-photos');

CREATE POLICY "Admins can upload team photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'team-photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update team photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'team-photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete team photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'team-photos' AND public.is_admin(auth.uid()));
