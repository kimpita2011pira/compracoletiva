CREATE OR REPLACE FUNCTION public.vendor_list_offer_orders(p_offer_id uuid)
RETURNS TABLE(
  order_id uuid,
  created_at timestamptz,
  status public.order_status,
  quantity integer,
  total_price numeric,
  delivery_type public.delivery_type,
  buyer_name text,
  buyer_phone text,
  address_label text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  zip_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.created_at,
    o.status,
    o.quantity,
    o.total_price,
    o.delivery_type,
    p.name::text,
    COALESCE(p.whatsapp, p.phone)::text,
    a.label::text,
    a.street::text,
    a.number::text,
    a.complement::text,
    a.neighborhood::text,
    a.city::text,
    a.state::text,
    a.zip_code::text
  FROM public.orders o
  JOIN public.offers off ON off.id = o.offer_id
  JOIN public.vendors v ON v.id = off.vendor_id
  LEFT JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN public.addresses a ON a.id = o.address_id
  WHERE o.offer_id = p_offer_id
    AND (v.user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'::public.app_role))
  ORDER BY o.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.vendor_list_offer_orders(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_list_offer_orders(uuid) TO authenticated;