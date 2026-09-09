-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260908080000_fix_bms_department_resolution.sql
--
-- Problem:
-- When approving a student enrolled in B.Com. (Management Studies) (SY), the
-- admin approval modal displays:
-- "NO MATCHING DEPARTMENT EXISTS IN THIS COLLEGE FOR THE STUDENT'S COURSE."
--
-- Root Cause:
-- 1. In production, BKBNC already has the department:
--    "B.Com. (Management Studies) (223005)" and class "SYBMS" (year = 2).
-- 2. However, the student's profile has course_code = '2126561' and
--    course_name = 'B.Com. (Management Studies)'.
-- 3. The function `public.admin_preview_student_assignment` only performed:
--    `d.name ILIKE '%(' || v_p.course_code || ')%'`
--    Because '%(2126561)%' does not match '%(223005)%', it failed with
--    `department_not_found`, disabling the "Approve & Activate" button.
-- 4. Furthermore, `admin_preview_student_assignment` did not resolve the actual
--    class row from `public.classes`, unlike `admin_approve_student`.
--
-- Solution:
-- 1. Update `course_code_to_class_suffix` to support both syllabus codes and
--    programme codes ('2126561'/'223005' -> 'BMS', etc.).
-- 2. Implement canonical `public.resolve_student_department(p_college_id, p_course_code, p_course_name)`:
--    - Accurately maps specialized programmes (BMS, BAF, BFM, BSc CS)
--    - Accurately maps general programmes (BCOM, BSC, BA) ensuring general
--      B.Com. does not collide with specialized B.Com. branches.
--    - Zero generic fallback: returns NULL if no matching department exists.
-- 3. Update `public.admin_preview_student_assignment` to use the canonical
--    resolver and return the actual class cohort from `public.classes`.
-- 4. Update `public.admin_approve_student` to use the canonical resolver and
--    eliminate any generic fallback department assignment.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update course_code_to_class_suffix to include college syllabus codes
CREATE OR REPLACE FUNCTION public.course_code_to_class_suffix(p_course_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_course_code
    WHEN '3180161' THEN 'BA'    WHEN '110101' THEN 'BA'
    WHEN '1150161' THEN 'BSC'   WHEN '111101' THEN 'BSC'
    WHEN '2126161' THEN 'BCOM'  WHEN '112101' THEN 'BCOM'
    WHEN '2126561' THEN 'BMS'   WHEN '223005' THEN 'BMS'
    WHEN '2126261' THEN 'BAF'   WHEN '223002' THEN 'BAF'
    WHEN '2126361' THEN 'BFM'   WHEN '223004' THEN 'BFM'
    WHEN '1151061' THEN 'CS'
    ELSE NULL END;
$$;

-- 2. Canonical Department Resolver for Colleges
CREATE OR REPLACE FUNCTION public.resolve_student_department(
  p_college_id uuid,
  p_course_code text,
  p_course_name text
)
RETURNS public.departments
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept public.departments;
  v_clean_code text := trim(coalesce(p_course_code, ''));
  v_clean_name text := trim(coalesce(p_course_name, ''));
BEGIN
  IF p_college_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Tier 1: Exact code match inside parentheses in department name: e.g. '%(1151061)%' or '%(223005)%'
  IF length(v_clean_code) > 0 THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id
      AND d.is_active = true
      AND d.name ILIKE '%(' || v_clean_code || ')%'
    LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- Tier 2: Specialized programmes by standardized abbreviation & keywords
  -- A. Management Studies (BMS)
  IF v_clean_name ILIKE '%Management Studies%' OR v_clean_name ILIKE '%BMS%' OR v_clean_code IN ('2126561', '223005') THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND (d.name ILIKE '%Management Studies%' OR d.name ILIKE '%(BMS)%' OR d.name ILIKE '%(223005)%')
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- B. Accounting & Finance (BAF)
  IF v_clean_name ILIKE '%Accounting%' OR v_clean_name ILIKE '%BAF%' OR v_clean_code IN ('2126261', '223002') THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND (d.name ILIKE '%Accounting%' OR d.name ILIKE '%(BAF)%' OR d.name ILIKE '%(223002)%')
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- C. Financial Markets (BFM)
  IF v_clean_name ILIKE '%Financial Markets%' OR v_clean_name ILIKE '%BFM%' OR v_clean_code IN ('2126361', '223004') THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND (d.name ILIKE '%Financial Markets%' OR d.name ILIKE '%(BFM)%' OR d.name ILIKE '%(223004)%')
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- D. Computer Science (BSc CS / CS)
  IF v_clean_name ILIKE '%Computer Science%' OR v_clean_name ILIKE '%BSc CS%' OR v_clean_name ILIKE '%(CS)%' OR v_clean_code IN ('1151061') THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND (d.name ILIKE '%Computer Science%' OR d.name ILIKE '%(CS)%' OR d.name ILIKE '%(1151061)%')
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- E. General Commerce (B.Com / BCOM) - strictly excludes specialized B.Com branches
  IF (v_clean_name ILIKE 'B.Com%' OR v_clean_name ILIKE 'BCom%' OR v_clean_code IN ('2126161', '112101'))
     AND v_clean_name NOT ILIKE '%Management%'
     AND v_clean_name NOT ILIKE '%Accounting%'
     AND v_clean_name NOT ILIKE '%Financial%' THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND d.name ILIKE 'B.Com%'
      AND d.name NOT ILIKE '%Management%'
      AND d.name NOT ILIKE '%Accounting%'
      AND d.name NOT ILIKE '%Financial%'
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- F. General Science (B.Sc / BSc) - strictly excludes Computer Science
  IF (v_clean_name ILIKE 'B.Sc%' OR v_clean_name ILIKE 'BSc%' OR v_clean_code IN ('1150161', '111101'))
     AND v_clean_name NOT ILIKE '%Computer Science%'
     AND v_clean_name NOT ILIKE '%CS%' THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND d.name ILIKE 'B.Sc%'
      AND d.name NOT ILIKE '%Computer Science%'
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- G. General Arts (B.A / BA)
  IF v_clean_name ILIKE 'B.A%' OR v_clean_name ILIKE 'BA%' OR v_clean_code IN ('3180161', '110101') THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND d.name ILIKE 'B.A%'
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  -- Tier 3: Direct case-insensitive prefix / full name match
  IF length(v_clean_name) > 0 THEN
    SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND (
        lower(d.name) = lower(v_clean_name)
        OR d.name ILIKE (v_clean_name || '%')
      )
    ORDER BY d.created_at ASC LIMIT 1;
    IF v_dept.id IS NOT NULL THEN RETURN v_dept; END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Robust ensure_department_classes
CREATE OR REPLACE FUNCTION public.ensure_department_classes(p_department_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dept record;
  v_suffix text;
  v_yr text;
  v_yint int;
BEGIN
  SELECT id, college_id, name INTO v_dept FROM public.departments WHERE id = p_department_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_suffix := course_code_to_class_suffix(substring(v_dept.name from '\(([0-9]+)\)'));

  IF v_suffix IS NULL THEN
    IF v_dept.name ILIKE '%Management Studies%' OR v_dept.name ILIKE '%BMS%' THEN
      v_suffix := 'BMS';
    ELSIF v_dept.name ILIKE '%Accounting%' OR v_dept.name ILIKE '%BAF%' THEN
      v_suffix := 'BAF';
    ELSIF v_dept.name ILIKE '%Financial Markets%' OR v_dept.name ILIKE '%BFM%' THEN
      v_suffix := 'BFM';
    ELSIF v_dept.name ILIKE '%Computer Science%' OR v_dept.name ILIKE '%CS%' THEN
      v_suffix := 'CS';
    ELSIF v_dept.name ILIKE 'B.Com%' THEN
      v_suffix := 'BCOM';
    ELSIF v_dept.name ILIKE 'B.Sc%' THEN
      v_suffix := 'BSC';
    ELSIF v_dept.name ILIKE 'B.A%' THEN
      v_suffix := 'BA';
    ELSE
      v_suffix := upper(regexp_replace(split_part(v_dept.name, ' (', 1), '[^A-Za-z]', '', 'g'));
      IF v_suffix = '' THEN v_suffix := 'GEN'; END IF;
    END IF;
  END IF;

  FOREACH v_yr IN ARRAY ARRAY['FY','SY','TY'] LOOP
    v_yint := year_to_int(v_yr);
    INSERT INTO public.classes (college_id, department_id, name, year, is_active)
    VALUES (v_dept.college_id, v_dept.id, v_yr || v_suffix, v_yint, true)
    ON CONFLICT (college_id, department_id, year)
      WHERE department_id IS NOT NULL AND year IS NOT NULL
    DO NOTHING;
  END LOOP;
END; $$;

-- 4. Update admin_preview_student_assignment RPC
CREATE OR REPLACE FUNCTION public.admin_preview_student_assignment(
  p_user_id uuid,
  p_college_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_p record;
  v_dept public.departments;
  v_class public.classes;
  v_yint int;
  v_class_name text;
BEGIN
  -- 1. Authorization check
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

  IF p_college_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- 2. Fetch profile
  SELECT course_code, course_name, academic_year INTO v_p
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'student_not_found');
  END IF;

  -- 3. Resolve department using canonical resolver
  v_dept := public.resolve_student_department(p_college_id, v_p.course_code, v_p.course_name);

  IF v_dept.id IS NULL THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'department_not_found',
      'course_code', v_p.course_code,
      'course_name', v_p.course_name
    );
  END IF;

  -- 4. Resolve class from existing classes
  v_yint := year_to_int(v_p.academic_year);

  IF v_yint IS NOT NULL THEN
    SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id
      AND department_id = v_dept.id
      AND year = v_yint
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_class.id IS NULL AND v_p.academic_year IS NOT NULL THEN
    SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id
      AND department_id = v_dept.id
      AND name ILIKE ('%' || trim(v_p.academic_year) || '%')
      AND is_active = true
    ORDER BY name ASC
    LIMIT 1;
  END IF;

  IF v_class.id IS NOT NULL THEN
    v_class_name := v_class.name;
  ELSE
    v_class_name := v_p.academic_year || COALESCE(course_code_to_class_suffix(v_p.course_code), '');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'department_id', v_dept.id,
    'department_name', v_dept.name,
    'class_id', v_class.id,
    'class_name', v_class_name,
    'academic_year', v_p.academic_year
  );
END;
$$;

-- 5. Update admin_approve_student RPC with canonical resolver & no generic fallback
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
  v_dept public.departments;
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

  -- 4. Resolve Department using canonical resolver (No generic fallback)
  v_dept := public.resolve_student_department(p_college_id, v_p.course_code, v_p.course_name);

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

REVOKE ALL ON FUNCTION public.resolve_student_department(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_student_department(uuid, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_preview_student_assignment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_student_assignment(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_approve_student(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_student(uuid, uuid, text) TO authenticated, service_role;
