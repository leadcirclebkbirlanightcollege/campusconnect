
-- ── Phase: Add college_id to core tables (nullable for backward compat) ──────

-- 1. profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_college_id ON public.profiles(college_id);

-- 2. user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_college_id ON public.user_roles(college_id);

-- 3. lectures
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lectures_college_id ON public.lectures(college_id);

-- 4. attendance
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_college_id ON public.attendance(college_id);

-- 5. points_ledger
ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_points_ledger_college_id ON public.points_ledger(college_id);

-- 6. core_team_members
ALTER TABLE public.core_team_members
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_core_team_members_college_id ON public.core_team_members(college_id);

-- 7. Security-definer helper for super_admin check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'super_admin'
  );
$$;

-- 8. RLS: Super admins can read ALL colleges (including inactive)
DROP POLICY IF EXISTS "Super admins can read all colleges" ON public.colleges;
CREATE POLICY "Super admins can read all colleges"
  ON public.colleges FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- 9. Get college admins helper function
CREATE OR REPLACE FUNCTION public.get_college_admins()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(
    json_build_object(
      'user_id', ur.user_id,
      'college_id', ur.college_id,
      'college_name', c.college_name,
      'name', p.name,
      'email', p.email,
      'created_at', ur.created_at
    ) ORDER BY ur.created_at DESC
  ), '[]'::json)
  FROM public.user_roles ur
  LEFT JOIN public.colleges c ON c.id = ur.college_id
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin';
$$;
