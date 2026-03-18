
-- Allow faculty to view lectures in their college
CREATE POLICY "Faculty can view college lectures"
ON public.lectures FOR SELECT
USING (is_faculty(auth.uid()) AND college_id = public.get_my_college_id());

-- Allow faculty to view attendance records for their college's lectures
CREATE POLICY "Faculty can view attendance"
ON public.attendance FOR SELECT
USING (
  is_faculty(auth.uid()) AND
  lecture_id IN (
    SELECT id FROM public.lectures
    WHERE college_id = public.get_my_college_id()
  )
);

-- Allow faculty to view profiles (students) in their college
CREATE POLICY "Faculty can view college profiles"
ON public.profiles FOR SELECT
USING (
  is_faculty(auth.uid()) AND college_id = public.get_my_college_id()
);

-- Allow faculty to create announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'Faculty can create announcements'
  ) THEN
    CREATE POLICY "Faculty can create announcements"
    ON public.announcements FOR INSERT
    WITH CHECK (is_faculty(auth.uid()) OR is_admin(auth.uid()));
  END IF;
END $$;

-- Allow faculty + active users to view all announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'announcements' AND policyname = 'Active users can view announcements'
  ) THEN
    CREATE POLICY "Active users can view announcements"
    ON public.announcements FOR SELECT
    USING (is_active_user(auth.uid()));
  END IF;
END $$;
