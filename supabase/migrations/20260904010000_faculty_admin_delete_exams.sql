-- Migration: Allow faculty and admin to delete exams securely
-- Function: delete_exam

CREATE OR REPLACE FUNCTION public.delete_exam(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_exam record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found' USING ERRCODE = 'P0002';
  END IF;

  -- Caller must be:
  -- 1) Super admin
  -- 2) College admin for this college
  -- 3) The faculty member who created the exam
  -- 4) A faculty member of the same college
  IF NOT (
    is_super_admin(v_caller)
    OR is_admin(v_caller)
    OR v_exam.created_by = v_caller
    OR (is_faculty(v_caller) AND v_exam.college_id = get_my_college_id())
  ) THEN
    RAISE EXCEPTION 'Permission denied: you are not authorized to delete this examination'
      USING ERRCODE = '42501';
  END IF;

  -- Delete associated student marks / results first
  DELETE FROM public.exam_results WHERE exam_id = p_exam_id;

  -- Delete the exam record
  DELETE FROM public.exams WHERE id = p_exam_id;

  RETURN json_build_object('ok', true, 'deleted_id', p_exam_id);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_exam(uuid) TO authenticated;

-- Also update the guard trigger so DELETE on exam_results doesn't fail if exam is being deleted
CREATE OR REPLACE FUNCTION public.guard_locked_exam_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exam_id uuid;
  v_status text;
  v_caller uuid := auth.uid();
  v_created_by uuid;
BEGIN
  -- Super admins and college admins can always override
  IF is_admin(v_caller) OR is_super_admin(v_caller) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_exam_id := COALESCE(NEW.exam_id, OLD.exam_id);
  SELECT status, created_by INTO v_status, v_created_by FROM public.exams WHERE id = v_exam_id;

  -- If the exam does not exist (e.g. being deleted in cascade), allow deletion
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- If this is a DELETE and the caller is the exam creator or faculty from the college, allow deletion
  IF TG_OP = 'DELETE' AND (v_created_by = v_caller OR is_faculty(v_caller)) THEN
    RETURN OLD;
  END IF;

  -- For INSERT or UPDATE, prevent editing if exam is locked or published
  IF v_status IN ('LOCKED', 'PUBLISHED') THEN
    RAISE EXCEPTION 'Exam marks are locked or published and cannot be modified by faculty. Contact an administrator to unlock.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
