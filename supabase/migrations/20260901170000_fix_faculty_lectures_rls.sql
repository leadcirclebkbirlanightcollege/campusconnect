-- ============================================================================
-- Fix Faculty Dashboard Lecture Creation & Operations RLS Policies
-- ============================================================================

-- 1. LECTURES: Allow authorized faculty and admins to insert, update, delete
DROP POLICY IF EXISTS "Only admins can manage lectures" ON public.lectures;
DROP POLICY IF EXISTS "Admins and faculty can create lectures" ON public.lectures;
CREATE POLICY "Admins and faculty can create lectures"
ON public.lectures
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND college_id = get_my_college_id())
  OR (
    is_faculty(auth.uid())
    AND created_by = auth.uid()
    AND (college_id = get_my_college_id() OR college_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Only admins can update lectures" ON public.lectures;
DROP POLICY IF EXISTS "Admins and faculty can update lectures" ON public.lectures;
CREATE POLICY "Admins and faculty can update lectures"
ON public.lectures
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND college_id = get_my_college_id())
  OR (
    is_faculty(auth.uid())
    AND created_by = auth.uid()
    AND college_id = get_my_college_id()
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND college_id = get_my_college_id())
  OR (
    is_faculty(auth.uid())
    AND created_by = auth.uid()
    AND college_id = get_my_college_id()
  )
);

DROP POLICY IF EXISTS "Only admins can delete lectures" ON public.lectures;
DROP POLICY IF EXISTS "Admins and faculty can delete lectures" ON public.lectures;
CREATE POLICY "Admins and faculty can delete lectures"
ON public.lectures
FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND college_id = get_my_college_id())
  OR (
    is_faculty(auth.uid())
    AND created_by = auth.uid()
    AND college_id = get_my_college_id()
  )
);

-- 2. LECTURE PROGRAMME TAGS: Allow faculty to manage tags for their own lectures
DROP POLICY IF EXISTS "Admins can manage lecture tags" ON public.lecture_programme_tags;
DROP POLICY IF EXISTS "Admins and faculty can manage lecture tags" ON public.lecture_programme_tags;
CREATE POLICY "Admins and faculty can manage lecture tags"
ON public.lecture_programme_tags
FOR ALL
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = lecture_programme_tags.lecture_id
      AND l.college_id = get_my_college_id()
      AND (
        is_admin(auth.uid())
        OR (is_faculty(auth.uid()) AND l.created_by = auth.uid())
      )
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.id = lecture_programme_tags.lecture_id
      AND l.college_id = get_my_college_id()
      AND (
        is_admin(auth.uid())
        OR (is_faculty(auth.uid()) AND l.created_by = auth.uid())
      )
  )
);

-- 3. ATTENDANCE: Allow faculty to manually mark and update attendance for lectures they created
DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins and faculty can insert attendance" ON public.attendance;
CREATE POLICY "Admins and faculty can insert attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR (
    is_faculty(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = attendance.lecture_id
        AND l.created_by = auth.uid()
        AND l.college_id = get_my_college_id()
    )
  )
);

DROP POLICY IF EXISTS "Admins and faculty can update attendance" ON public.attendance;
CREATE POLICY "Admins and faculty can update attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    is_faculty(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = attendance.lecture_id
        AND l.created_by = auth.uid()
        AND l.college_id = get_my_college_id()
    )
  )
);
