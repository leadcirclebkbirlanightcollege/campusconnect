
-- 1. MESSAGES: scope SELECT to channel members or DM participants
DROP POLICY IF EXISTS "Active users can view channel messages" ON public.messages;

CREATE POLICY "Users can view their channel or DM messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND is_active_user(auth.uid())
  AND (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR (
      channel_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = messages.channel_id
          AND cm.user_id = auth.uid()
      )
    )
    OR is_admin(auth.uid())
  )
);

-- 2. PROFILES: drop the over-broad policy. Existing "profiles_select_own_or_admin"
-- and "Faculty can view college profiles" continue to provide correct scoped access.
DROP POLICY IF EXISTS "Users can view active profiles" ON public.profiles;

-- 3. POLL VOTES: scope by anonymity
DROP POLICY IF EXISTS "Active users can view all poll votes" ON public.poll_votes;

CREATE POLICY "Voters and admins see own votes"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_votes.poll_id
      AND p.is_anonymous = false
  )
);

-- 4. STORAGE: restrict message attachments
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view own message attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR is_admin(auth.uid())
  )
);
