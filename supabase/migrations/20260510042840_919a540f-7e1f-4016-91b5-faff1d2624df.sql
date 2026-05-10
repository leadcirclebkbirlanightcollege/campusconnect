
-- ============ DEPARTMENTS ============
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, normalized_name)
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select_same_college" ON public.departments
  FOR SELECT TO authenticated
  USING (college_id = public.get_my_college_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "departments_admin_write" ON public.departments
  FOR ALL TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EXTEND PROGRAMMES ============
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_code text;

CREATE UNIQUE INDEX IF NOT EXISTS programmes_college_code_uniq
  ON public.programmes (college_id, programme_code)
  WHERE programme_code IS NOT NULL;

-- ============ EXTEND PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enrollment_no text,
  ADD COLUMN IF NOT EXISTS roll_no text,
  ADD COLUMN IF NOT EXISTS admission_no text,
  ADD COLUMN IF NOT EXISTS erp_student_id text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS enrollment_status text,
  ADD COLUMN IF NOT EXISTS validity_start date,
  ADD COLUMN IF NOT EXISTS validity_end date,
  ADD COLUMN IF NOT EXISTS academic_session text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_college_enrollment_uniq
  ON public.profiles (college_id, enrollment_no)
  WHERE enrollment_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_dept_idx ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS profiles_prog_idx ON public.profiles(programme_id);

-- ============ ERP IMPORT BATCHES ============
CREATE TABLE IF NOT EXISTS public.erp_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  filename text,
  status text NOT NULL DEFAULT 'pending',
  total_records int NOT NULL DEFAULT 0,
  valid_count int NOT NULL DEFAULT 0,
  invalid_count int NOT NULL DEFAULT 0,
  duplicate_count int NOT NULL DEFAULT 0,
  created_count int NOT NULL DEFAULT 0,
  updated_count int NOT NULL DEFAULT 0,
  archived_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  full_replacement boolean NOT NULL DEFAULT true,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_batches_select" ON public.erp_import_batches
  FOR SELECT TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "erp_batches_admin_write" ON public.erp_import_batches
  FOR ALL TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER erp_batches_set_updated_at
  BEFORE UPDATE ON public.erp_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS erp_batches_college_idx ON public.erp_import_batches(college_id, created_at DESC);

-- ============ ERP IMPORT STAGING ============
CREATE TABLE IF NOT EXISTS public.erp_import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.erp_import_batches(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  raw jsonb NOT NULL,
  parsed jsonb,
  validation_state text NOT NULL DEFAULT 'pending',
  parsed_state text NOT NULL DEFAULT 'pending',
  error_reason text,
  diff_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_import_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_staging_select" ON public.erp_import_staging
  FOR SELECT TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "erp_staging_admin_write" ON public.erp_import_staging
  FOR ALL TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS erp_staging_batch_idx ON public.erp_import_staging(batch_id, row_number);

-- ============ ERP IMPORT ERRORS ============
CREATE TABLE IF NOT EXISTS public.erp_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.erp_import_batches(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  row_number int,
  reason text NOT NULL,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_import_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_errors_select" ON public.erp_import_errors
  FOR SELECT TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "erp_errors_admin_write" ON public.erp_import_errors
  FOR ALL TO authenticated
  USING ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND college_id = public.get_my_college_id()) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS erp_errors_batch_idx ON public.erp_import_errors(batch_id);
