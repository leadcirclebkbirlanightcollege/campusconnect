
-- Create colleges table
CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name text NOT NULL,
  subdomain text UNIQUE,
  logo_url text,
  tagline text,
  primary_color text DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage colleges"
  ON public.colleges FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Anyone can read active colleges"
  ON public.colleges FOR SELECT
  USING (is_active = true);

-- is_super_admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'super_admin'
  );
$$;

-- Update is_admin so super_admin inherits all admin privileges
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role IN ('admin', 'super_admin')
  );
$$;

-- Platform analytics view for super admin
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_colleges', (SELECT COUNT(*) FROM public.colleges),
    'active_colleges', (SELECT COUNT(*) FROM public.colleges WHERE is_active = true),
    'total_students', (SELECT COUNT(*) FROM public.profiles WHERE is_deleted = false),
    'total_lectures', (SELECT COUNT(*) FROM public.lectures),
    'total_attendance', (SELECT COUNT(*) FROM public.attendance),
    'total_points_awarded', (SELECT COALESCE(SUM(points), 0) FROM public.points_ledger)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_analytics() TO authenticated;
