
CREATE POLICY "Admins can read verify-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE POLICY "Admins can upload verify-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE POLICY "Admins can update verify-documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE POLICY "Admins can delete verify-documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'verify-documents' AND (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())));
