-- Backfill the single orphaned programme to the only existing college
UPDATE public.programmes p SET college_id = (SELECT id FROM public.colleges LIMIT 1) WHERE p.college_id IS NULL;

-- ── ANNOUNCEMENTS (no college_id column → scope via creator's college) ──
DROP POLICY IF EXISTS "Active users can view announcements" ON public.announcements;
CREATE POLICY "Active users can view announcements" ON public.announcements FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (is_active_user(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.user_id = announcements.created_by
          AND pr.college_id = get_my_college_id()))
);
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.user_id = announcements.created_by
          AND pr.college_id = get_my_college_id()))
)
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()));

-- ── POLLS (no college_id column → scope via creator's college) ──
DROP POLICY IF EXISTS "Active users can view polls" ON public.polls;
CREATE POLICY "Active users can view polls" ON public.polls FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (is_active_user(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.user_id = polls.created_by
          AND pr.college_id = get_my_college_id()))
);
DROP POLICY IF EXISTS "Admins can manage polls" ON public.polls;
CREATE POLICY "Admins can manage polls" ON public.polls FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.user_id = polls.created_by
          AND pr.college_id = get_my_college_id()))
)
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()));

-- ── ASSIGNMENTS ──
DROP POLICY IF EXISTS "Students can view assignments" ON public.assignments;
CREATE POLICY "Students can view assignments" ON public.assignments FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Admins and faculty can manage assignments" ON public.assignments;
CREATE POLICY "Admins and faculty can manage assignments" ON public.assignments FOR ALL
USING (is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id()));

-- ── EXAMS ──
DROP POLICY IF EXISTS "Active users can view exams" ON public.exams;
CREATE POLICY "Active users can view exams" ON public.exams FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Admins and faculty can manage exams" ON public.exams;
CREATE POLICY "Admins and faculty can manage exams" ON public.exams FOR ALL
USING (is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id()));

-- ── DOCUMENTS ──
DROP POLICY IF EXISTS "Students can view accessible documents" ON public.documents;
CREATE POLICY "Students can view accessible documents" ON public.documents FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Faculty and admins can manage documents" ON public.documents;
CREATE POLICY "Faculty and admins can manage documents" ON public.documents FOR ALL
USING (is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR ((is_admin(auth.uid()) OR is_faculty(auth.uid())) AND college_id = get_my_college_id()));

-- ── LECTURES ──
DROP POLICY IF EXISTS "Active users can view lectures" ON public.lectures;
CREATE POLICY "Active users can view lectures" ON public.lectures FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Only admins can update lectures" ON public.lectures;
CREATE POLICY "Only admins can update lectures" ON public.lectures FOR UPDATE
USING (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Only admins can delete lectures" ON public.lectures;
CREATE POLICY "Only admins can delete lectures" ON public.lectures FOR DELETE
USING (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()));

-- ── LECTURE PROGRAMME TAGS (scope via parent lecture) ──
DROP POLICY IF EXISTS "Active users can view lecture tags" ON public.lecture_programme_tags;
CREATE POLICY "Active users can view lecture tags" ON public.lecture_programme_tags FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (is_active_user(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.lectures l
        WHERE l.id = lecture_programme_tags.lecture_id
          AND l.college_id = get_my_college_id()))
);
DROP POLICY IF EXISTS "Admins can manage lecture tags" ON public.lecture_programme_tags;
CREATE POLICY "Admins can manage lecture tags" ON public.lecture_programme_tags FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.lectures l
        WHERE l.id = lecture_programme_tags.lecture_id
          AND l.college_id = get_my_college_id()))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
        SELECT 1 FROM public.lectures l
        WHERE l.id = lecture_programme_tags.lecture_id
          AND l.college_id = get_my_college_id()))
);

-- ── TIMETABLE SLOTS ──
DROP POLICY IF EXISTS "Active users can view timetable" ON public.timetable_slots;
CREATE POLICY "Active users can view timetable" ON public.timetable_slots FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Admins can manage timetable" ON public.timetable_slots;
CREATE POLICY "Admins can manage timetable" ON public.timetable_slots FOR ALL
USING (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()));

-- ── CLASSES ──
DROP POLICY IF EXISTS "Active users can view classes" ON public.classes;
CREATE POLICY "Active users can view classes" ON public.classes FOR SELECT
USING (is_super_admin(auth.uid()) OR ((is_active_user(auth.uid()) OR is_admin(auth.uid())) AND is_active = true AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL
USING (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()));

-- ── PROGRAMMES ──
DROP POLICY IF EXISTS "Active users can view programmes" ON public.programmes;
CREATE POLICY "Active users can view programmes" ON public.programmes FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND is_active = true AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Admins can manage programmes" ON public.programmes;
CREATE POLICY "Admins can manage programmes" ON public.programmes FOR ALL
USING (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()));

-- ── CLASS PROMOTION RULES ──
DROP POLICY IF EXISTS "promotion_rules_read" ON public.class_promotion_rules;
CREATE POLICY "promotion_rules_read" ON public.class_promotion_rules FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id()));

-- ── CHANNELS ──
DROP POLICY IF EXISTS "Active users can view channels" ON public.channels;
CREATE POLICY "Active users can view channels" ON public.channels FOR SELECT
USING (is_super_admin(auth.uid()) OR (is_active_user(auth.uid()) AND college_id = get_my_college_id()));
DROP POLICY IF EXISTS "Admins can manage channels" ON public.channels;
CREATE POLICY "Admins can manage channels" ON public.channels FOR ALL
USING (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()))
WITH CHECK (is_super_admin(auth.uid()) OR (is_admin(auth.uid()) AND college_id = get_my_college_id()));

-- ── CHANNEL MEMBERS (only members of the same channel, or same-college admins) ──
DROP POLICY IF EXISTS "Users can view channel memberships" ON public.channel_members;
CREATE POLICY "Users can view channel memberships" ON public.channel_members FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR channel_members.user_id = auth.uid()
  OR EXISTS (
       SELECT 1 FROM public.channel_members me
       WHERE me.channel_id = channel_members.channel_id
         AND me.user_id = auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
       SELECT 1 FROM public.channels c
       WHERE c.id = channel_members.channel_id
         AND c.college_id = get_my_college_id()))
);
DROP POLICY IF EXISTS "Admins can manage channel members" ON public.channel_members;
CREATE POLICY "Admins can manage channel members" ON public.channel_members FOR ALL
USING (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
       SELECT 1 FROM public.channels c
       WHERE c.id = channel_members.channel_id
         AND c.college_id = get_my_college_id()))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (is_admin(auth.uid()) AND EXISTS (
       SELECT 1 FROM public.channels c
       WHERE c.id = channel_members.channel_id
         AND c.college_id = get_my_college_id()))
);

-- ── PLATFORM SETTINGS (admins only) ──
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings" ON public.platform_settings FOR SELECT
USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));