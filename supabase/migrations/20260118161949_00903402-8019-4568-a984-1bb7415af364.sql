-- 1) Points rules (singleton-style table)
CREATE TABLE IF NOT EXISTS public.points_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  points_per_attendance integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.points_rules ENABLE ROW LEVEL SECURITY;

-- Everyone who is an active user (or admin) can read the current rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='points_rules' AND policyname='Active users can view points rules'
  ) THEN
    CREATE POLICY "Active users can view points rules"
    ON public.points_rules
    FOR SELECT
    USING (is_active_user(auth.uid()) OR is_admin(auth.uid()));
  END IF;
END $$;

-- Only admins can manage rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='points_rules' AND policyname='Admins can insert points rules'
  ) THEN
    CREATE POLICY "Admins can insert points rules"
    ON public.points_rules
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='points_rules' AND policyname='Admins can update points rules'
  ) THEN
    CREATE POLICY "Admins can update points rules"
    ON public.points_rules
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='points_rules' AND policyname='Admins can delete points rules'
  ) THEN
    CREATE POLICY "Admins can delete points rules"
    ON public.points_rules
    FOR DELETE
    USING (is_admin(auth.uid()));
  END IF;
END $$;

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_points_rules_updated_at ON public.points_rules;
CREATE TRIGGER update_points_rules_updated_at
BEFORE UPDATE ON public.points_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a default row if empty
INSERT INTO public.points_rules (points_per_attendance)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules);


-- 2) Profiles: add avatar_url column for storing public URL (NOT the file itself)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;


-- 3) Storage: create avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for avatars
DO $$
BEGIN
  -- Public read access for avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  -- Users can upload their own avatar to folder: <uid>/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can update their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Users can delete their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;