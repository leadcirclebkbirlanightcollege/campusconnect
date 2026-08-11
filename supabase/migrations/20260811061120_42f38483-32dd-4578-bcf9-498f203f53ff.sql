GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_faculty(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_student(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_college_id() TO anon;