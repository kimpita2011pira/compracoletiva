
DROP POLICY "Anyone can view active banners" ON public.promo_banners;
DROP POLICY "Admins manage banners" ON public.promo_banners;

CREATE POLICY "Anyone can view active banners"
ON public.promo_banners FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins manage banners"
ON public.promo_banners FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));
