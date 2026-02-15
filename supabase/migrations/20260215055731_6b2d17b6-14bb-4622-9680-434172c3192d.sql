-- Fix: Allow admins to insert attendance for any student (manual override)
CREATE POLICY "Admins can insert attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));
