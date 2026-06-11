
-- Allow super_admins to upload/update/delete landing-page assets in lecture-flyers bucket
CREATE POLICY "super_admin manage landing-assets"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'lecture-flyers'
  AND (storage.foldername(name))[1] = 'landing'
  AND public.is_super_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'lecture-flyers'
  AND (storage.foldername(name))[1] = 'landing'
  AND public.is_super_admin(auth.uid())
);

-- Seed default landing_content row (empty object => app uses code defaults)
INSERT INTO public.platform_settings (key, value)
VALUES ('landing_content', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
