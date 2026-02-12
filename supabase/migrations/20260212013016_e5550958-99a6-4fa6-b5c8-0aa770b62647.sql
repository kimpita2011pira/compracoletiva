-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins manage offers" ON public.offers;
DROP POLICY IF EXISTS "Vendors manage own offers" ON public.offers;
DROP POLICY IF EXISTS "View active offers" ON public.offers;

-- Recreate as PERMISSIVE policies
-- Anyone can view active offers (marketplace)
CREATE POLICY "Anyone can view active offers"
ON public.offers FOR SELECT
TO anon, authenticated
USING (status = 'ATIVA'::offer_status);

-- Vendors can manage their own offers
CREATE POLICY "Vendors manage own offers"
ON public.offers FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM vendors v
  WHERE v.id = offers.vendor_id AND v.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM vendors v
  WHERE v.id = offers.vendor_id AND v.user_id = auth.uid()
));

-- Admins can manage all offers
CREATE POLICY "Admins manage all offers"
ON public.offers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role));