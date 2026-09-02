DROP POLICY IF EXISTS "Anyone view franchise cities" ON public.franchise_cities;
CREATE POLICY "Authenticated view franchise cities"
ON public.franchise_cities
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.franchise_cities FROM anon;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Authenticated can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.reviews FROM anon;