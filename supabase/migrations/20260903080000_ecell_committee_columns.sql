-- ── Extend core_team_members for E-Cell Committee Management ──────────
ALTER TABLE public.core_team_members
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS contact_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Ensure sync between class and department if either is provided
UPDATE public.core_team_members
SET department = class
WHERE department IS NULL AND class IS NOT NULL;
