ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS verified_by uuid NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles (is_verified);
