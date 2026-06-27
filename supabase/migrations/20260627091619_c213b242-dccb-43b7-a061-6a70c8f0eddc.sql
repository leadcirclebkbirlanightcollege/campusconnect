
-- Fix get_my_college_id determinism
CREATE OR REPLACE FUNCTION public.get_my_college_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT college_id FROM public.user_roles
  WHERE user_id = auth.uid()
    AND college_id IS NOT NULL
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'faculty' THEN 3
      WHEN 'student' THEN 4
      ELSE 5
    END,
    created_at ASC
  LIMIT 1;
$$;

-- Tighten poll_votes SELECT to voter + admin only
DROP POLICY IF EXISTS "Voters and admins see own votes" ON public.poll_votes;
CREATE POLICY "Voters and admins see own votes"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Documents bucket: add SELECT policy (owner-by-folder or admin)
CREATE POLICY "Users can view own documents or admins"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);
