CREATE OR REPLACE FUNCTION public.can_upload_offer_image(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = _user_id
      AND v.status = 'APROVADO'::public.vendor_status
  )
$$;

REVOKE ALL ON FUNCTION public.can_upload_offer_image(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_offer_image(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_offer_image(uuid) TO service_role;

DROP POLICY IF EXISTS "Vendors can upload offer images" ON storage.objects;

CREATE POLICY "Vendors can upload offer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.can_upload_offer_image(auth.uid())
);