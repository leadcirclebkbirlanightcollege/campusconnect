
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS classes_unique_college_dept_year
  ON public.classes (college_id, department_id, year)
  WHERE department_id IS NOT NULL AND year IS NOT NULL;

CREATE OR REPLACE FUNCTION public.course_code_to_class_suffix(p_course_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_course_code
    WHEN '3180161' THEN 'BA' WHEN '1150161' THEN 'BSC' WHEN '2126161' THEN 'BCOM'
    WHEN '2126561' THEN 'BMS' WHEN '2126261' THEN 'BAF' WHEN '2126361' THEN 'BFM'
    WHEN '1151061' THEN 'CS' ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.year_to_int(p_year text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_year WHEN 'FY' THEN 1 WHEN 'SY' THEN 2 WHEN 'TY' THEN 3 ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_department_classes(p_department_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dept record; v_suffix text; v_yr text; v_yint int;
BEGIN
  SELECT id, college_id, name INTO v_dept FROM public.departments WHERE id = p_department_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_suffix := course_code_to_class_suffix(substring(v_dept.name from '\(([0-9]+)\)'));
  IF v_suffix IS NULL THEN
    v_suffix := upper(regexp_replace(split_part(v_dept.name, ' (', 1), '[^A-Za-z]', '', 'g'));
    IF v_suffix = '' THEN v_suffix := 'GEN'; END IF;
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

CREATE OR REPLACE FUNCTION public.admin_preview_student_assignment(p_user_id uuid, p_college_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p record; v_dept record; v_class_name text;
BEGIN
  IF NOT (is_admin(auth.uid()) OR is_super_admin(auth.uid())) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  SELECT course_code, course_name, academic_year INTO v_p FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'student_not_found'); END IF;
  SELECT d.* INTO v_dept FROM public.departments d
    WHERE d.college_id = p_college_id AND d.is_active = true
      AND d.name ILIKE '%(' || v_p.course_code || ')%' LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'department_not_found',
      'course_code', v_p.course_code, 'course_name', v_p.course_name);
  END IF;
  v_class_name := v_p.academic_year || COALESCE(course_code_to_class_suffix(v_p.course_code), '');
  RETURN json_build_object('ok', true, 'department_id', v_dept.id, 'department_name', v_dept.name,
    'class_name', v_class_name, 'academic_year', v_p.academic_year);
END; $$;

DROP FUNCTION IF EXISTS public.admin_approve_student(uuid, uuid, text);
CREATE FUNCTION public.admin_approve_student(p_user_id uuid, p_college_id uuid, p_student_id text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_p record; v_dept record; v_class record; v_yint int;
BEGIN
  IF NOT (is_admin(v_caller) OR is_super_admin(v_caller)) THEN RAISE EXCEPTION 'permission_denied: admin role required'; END IF;
  IF p_college_id IS NULL THEN RAISE EXCEPTION 'invalid_input: college_id required'; END IF;

  SELECT * INTO v_p FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'student_not_found'; END IF;
  IF NOT v_p.profile_completed THEN RAISE EXCEPTION 'onboarding_incomplete'; END IF;
  IF v_p.approval_status = 'approved' THEN RAISE EXCEPTION 'already_approved'; END IF;
  IF v_p.enrollment_number IS NULL OR length(trim(v_p.enrollment_number)) = 0 THEN RAISE EXCEPTION 'missing_enrollment'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(enrollment_number) = lower(v_p.enrollment_number)
      AND user_id <> p_user_id AND approval_status = 'approved'
  ) THEN RAISE EXCEPTION 'duplicate_enrollment'; END IF;

  SELECT d.* INTO v_dept FROM public.departments d
   WHERE d.college_id = p_college_id AND d.is_active = true
     AND d.name ILIKE '%(' || v_p.course_code || ')%' LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'department_not_found'; END IF;

  PERFORM public.ensure_department_classes(v_dept.id);
  v_yint := year_to_int(v_p.academic_year);
  SELECT * INTO v_class FROM public.classes
    WHERE college_id = p_college_id AND department_id = v_dept.id AND year = v_yint LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'class_not_found'; END IF;

  UPDATE public.profiles
  SET approval_status='approved', college_assigned=true, college_id=p_college_id,
      department_id=v_dept.id, department=v_dept.name,
      class_id=v_class.id, class_name=v_class.name,
      student_id=COALESCE(NULLIF(p_student_id,''), student_id),
      approved_by=v_caller, approved_at=now(), rejection_reason=NULL, updated_at=now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_roles (user_id, role, college_id)
  VALUES (p_user_id, 'student', p_college_id)
  ON CONFLICT (user_id) DO UPDATE SET role='student', college_id=EXCLUDED.college_id;

  RETURN json_build_object('ok', true, 'department_id', v_dept.id, 'department_name', v_dept.name,
    'class_id', v_class.id, 'class_name', v_class.name);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_classes()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_col uuid; v_d record; v_cnt int := 0;
BEGIN
  IF NOT (is_admin(v_caller) OR is_super_admin(v_caller)) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  v_col := get_my_college_id();
  FOR v_d IN SELECT id FROM public.departments
              WHERE is_active = true AND (is_super_admin(v_caller) OR college_id = v_col) LOOP
    PERFORM public.ensure_department_classes(v_d.id);
    v_cnt := v_cnt + 1;
  END LOOP;
  RETURN json_build_object('ok', true, 'departments_processed', v_cnt);
END; $$;
