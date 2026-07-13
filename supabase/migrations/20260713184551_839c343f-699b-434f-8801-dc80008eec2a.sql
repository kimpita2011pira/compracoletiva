DROP POLICY IF EXISTS "Vendors can upload offer images" ON storage.objects;
CREATE POLICY "Vendors can upload offer images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.user_id = auth.uid() AND v.status = 'APROVADO')
);