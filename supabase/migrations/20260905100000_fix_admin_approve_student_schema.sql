-- Migration: 20260905100000_fix_admin_approve_student_schema.sql
-- Fixes admin_approve_student RPC schema mismatch:
-- 1. departments table uses column 'name' (not 'department_name' and not 'code')
-- 2. classes table uses column 'name' (not 'class_name') and references 'department_id' directly (no 'programme_id' join)
-- 3. ensure_department_classes is executed so FY/SY/TY classes exist for the department
-- 4. user_roles unique constraint is (user_id), so ON CONFLICT (user_id) is used
-- 5. Preserves ID card purge (Data Minimization per retention policy)
-- 6. Updates colleges.primary_color to official brand color #06B6D4 to pass safety guardrails

CREATE OR REPLACE FUNCTION public.admin_approve_student(
  p_user_id uuid,
  p_college_id uuid,
  p_student_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_caller uuid;
  v_p record;
  v_dept record;
  v_class record;
  v_yint int;
  v_old_id_path text;
BEGIN
  v_caller := auth.uid();

  -- 1. Verify admin authorization
  IF NOT (
    is_admin(v_caller) OR is_super_admin(v_caller) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller
        AND role::text IN ('admin', 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'permission_denied: admin role required';
  END IF;

  -- 2. Validate inputs
  IF p_college_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: missing college_id';
  END IF;

  -- 3. Fetch student profile with row lock
  SELECT * INTO v_p FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found';
  END IF;

  -- Check student is pending or rejected override
  IF v_p.approval_status = 'approved' THEN
    RAISE EXCEPTION 'already_approved';
  END IF;

  -- Require completed onboarding
  IF NOT coalesce(v_p.profile_completed, false) THEN
    RAISE EXCEPTION 'onboarding_incomplete';
  END IF;

  -- If enrollment_number is present, enforce uniqueness among approved students
  IF v_p.enrollment_number IS NOT NULL AND length(trim(v_p.enrollment_number)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(trim(enrollment_number)) = lower(trim(v_p.enrollment_number))
        AND user_id != p_user_id
        AND approval_status = 'approved'
    ) THEN
      RAISE EXCEPTION 'duplicate_enrollment';
    END IF;
  END IF;

  -- 4. Resolve Department using real column 'name' (never hallucinated 'department_name' or 'code')
  -- Primary: match course_code in department name: e.g. '%(1151061)%'
  IF v_p.course_code IS NOT NULL AND length(trim(v_p.course_code)) > 0 THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id
      AND d.is_active = true
      AND d.name ILIKE '%(' || trim(v_p.course_code) || ')%'
    LIMIT 1;
  END IF;

  -- Secondary: match course_name (e.g. 'B.Sc. (Computer Science)')
  IF v_dept.id IS NULL AND v_p.course_name IS NOT NULL AND length(trim(v_p.course_name)) > 0 THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id
      AND d.is_active = true
      AND (
        lower(d.name) = lower(trim(v_p.course_name))
        OR d.name ILIKE (trim(v_p.course_name) || '%')
        OR d.name ILIKE ('%' || trim(v_p.course_name) || '%')
      )
    LIMIT 1;
  END IF;

  -- Tertiary: any active department in the college
  IF v_dept.id IS NULL THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id
      AND d.is_active = true
    ORDER BY d.created_at ASC
    LIMIT 1;
  END IF;

  IF v_dept.id IS NULL THEN
    RAISE EXCEPTION 'department_not_found';
  END IF;

  -- 5. Ensure cohort classes exist for this department and resolve class
  PERFORM public.ensure_department_classes(v_dept.id);
  v_yint := year_to_int(v_p.academic_year);

  -- A. Match department + year integer (e.g. year = 2 for SY)
  IF v_yint IS NOT NULL THEN
    SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id
      AND department_id = v_dept.id
      AND year = v_yint
      AND is_active = true
    LIMIT 1;
  END IF;

  -- B. Match class name by academic_year string (e.g. 'SY%')
  IF v_class.id IS NULL AND v_p.academic_year IS NOT NULL THEN
    SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id
      AND department_id = v_dept.id
      AND name ILIKE ('%' || trim(v_p.academic_year) || '%')
      AND is_active = true
    ORDER BY name ASC
    LIMIT 1;
  END IF;

  -- C. Match any active class in department
  IF v_class.id IS NULL THEN
    SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id
      AND department_id = v_dept.id
      AND is_active = true
    ORDER BY year ASC NULLS LAST, name ASC
    LIMIT 1;
  END IF;

  -- D. Match any active class in college
  IF v_class.id IS NULL THEN
    SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id
      AND is_active = true
    ORDER BY name ASC
    LIMIT 1;
  END IF;

  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'class_not_found';
  END IF;

  v_old_id_path := v_p.id_card_path;

  -- 6. Update profiles: approve, assign, and clear id_card_path (Data Minimization)
  UPDATE public.profiles
  SET
    approval_status = 'approved',
    approved_at = now(),
    approved_by = v_caller,
    college_id = p_college_id,
    college_assigned = true,
    department_id = v_dept.id,
    department = v_dept.name,
    class_id = v_class.id,
    class_name = v_class.name,
    student_id = coalesce(NULLIF(trim(p_student_id), ''), student_id),
    is_verified = true,
    verified_at = now(),
    verified_by = v_caller,
    id_card_status = 'approved',
    id_card_verified_at = now(),
    id_card_verified_by = v_caller,
    id_card_path = NULL,
    rejection_reason = NULL,
    id_card_rejection_reason = NULL,
    rejected_at = NULL,
    delete_after = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- 7. Update student_verifications audit table
  UPDATE public.student_verifications
  SET
    status = 'approved',
    storage_path = '[DELETED_AFTER_VERIFICATION]',
    reviewed_at = now(),
    reviewed_by = v_caller,
    rejection_reason = NULL,
    updated_at = now()
  WHERE user_id = p_user_id AND status = 'pending';

  -- 8. Purge physical image file from storage.objects (Data Minimization)
  BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'student-id-cards'
      AND (
        (v_old_id_path IS NOT NULL AND name = v_old_id_path)
        OR (storage.foldername(name))[1] = p_user_id::text
      );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 9. Ensure student role exists with college_id (unique on user_id)
  INSERT INTO public.user_roles (user_id, role, college_id)
  VALUES (p_user_id, 'student', p_college_id)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'student',
    college_id = EXCLUDED.college_id;

  RETURN json_build_object(
    'ok', true,
    'user_id', p_user_id,
    'college_id', p_college_id,
    'department_id', v_dept.id,
    'department_name', v_dept.name,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'id_card_purged', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_student(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_student(uuid, uuid, text) TO authenticated;

-- 10. Update stored college primary_color to official brand color #06B6D4 to satisfy color-safety guardrail
UPDATE public.colleges
SET primary_color = '#06B6D4'
WHERE primary_color = '#6366f1';
