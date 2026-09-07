-- Migration: Dynamic count of approved, active students for Command Center and Admin
CREATE OR REPLACE FUNCTION public.get_approved_student_count(p_college_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'student'
    AND p.approval_status = 'approved'
    AND coalesce(p.is_deleted, false) = false
    AND (p_college_id IS NULL OR ur.college_id = p_college_id OR p.college_id = p_college_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_student_count(uuid) TO authenticated, service_role, anon;
