
-- 1) Hide vendor sensitive columns (cnpj, pix_key) from anon/authenticated at column-level
REVOKE SELECT (cnpj, pix_key) ON public.vendors FROM anon;
REVOKE SELECT (cnpj, pix_key) ON public.vendors FROM authenticated;
GRANT SELECT (cnpj, pix_key) ON public.vendors TO service_role;

-- RPC to return the current user's full vendor row (owner-only)
CREATE OR REPLACE FUNCTION public.get_my_vendor()
RETURNS SETOF public.vendors
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.vendors WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_vendor() TO authenticated;

-- RPC for admins to list all vendors with sensitive fields
CREATE OR REPLACE FUNCTION public.admin_list_vendors()
RETURNS SETOF public.vendors
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.*
  FROM public.vendors v
  WHERE public.has_role(auth.uid(), 'ADMIN'::public.app_role);
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_vendors() TO authenticated;

-- RPC for admin/franchisee to read a single vendor's sensitive fields
CREATE OR REPLACE FUNCTION public.get_vendor_secrets(_vendor_id uuid)
RETURNS TABLE(cnpj text, pix_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.cnpj, v.pix_key
  FROM public.vendors v
  WHERE v.id = _vendor_id
    AND (
      v.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)
      OR public.is_franchisee_for_city(auth.uid(), v.city, ''::varchar)
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_vendor_secrets(uuid) TO authenticated;

-- 2) Harden storage.objects UPDATE/DELETE policies for offer-images to require approved vendor
DROP POLICY IF EXISTS "Users can update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own offer images" ON storage.objects;

CREATE POLICY "Approved vendors can update own offer images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.user_id = auth.uid() AND v.status = 'APROVADO'::public.vendor_status
  )
)
WITH CHECK (
  bucket_id = 'offer-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.user_id = auth.uid() AND v.status = 'APROVADO'::public.vendor_status
  )
);

CREATE POLICY "Approved vendors can delete own offer images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.user_id = auth.uid() AND v.status = 'APROVADO'::public.vendor_status
  )
);
