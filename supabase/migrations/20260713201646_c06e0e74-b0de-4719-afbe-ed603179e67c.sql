DROP POLICY IF EXISTS "Vendors can upload offer images" ON storage.objects;

CREATE POLICY "Vendors can upload offer images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'offer-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.can_upload_offer_image(auth.uid())
);