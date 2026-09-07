-- Migration: 20260908030000_allow_student_self_role_insert.sql
-- Allows newly signed-up authenticated students to insert their own student role

DROP POLICY IF EXISTS "Users can insert own student role" ON public.user_roles;

CREATE POLICY "Users can insert own student role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'student');
