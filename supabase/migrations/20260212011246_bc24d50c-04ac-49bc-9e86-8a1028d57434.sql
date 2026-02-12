-- Drop ALL existing vendor policies (both old restrictive and newly added permissive)
DROP POLICY IF EXISTS "Admins manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Owner manages vendor" ON public.vendors;
DROP POLICY IF EXISTS "View approved vendors" ON public.vendors;
DROP POLICY IF EXISTS "Vendors can view own vendor record" ON public.vendors;
DROP POLICY IF EXISTS "Vendors can update own vendor record" ON public.vendors;
DROP POLICY IF EXISTS "Vendors can insert own vendor record" ON public.vendors;
DROP POLICY IF EXISTS "Anyone can view approved vendors" ON public.vendors;

-- Recreate as PERMISSIVE (default) policies with proper OR logic
-- Owners can fully manage their own vendor record (any status)
CREATE POLICY "Owner can select own vendor"
ON public.vendors FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own vendor"
ON public.vendors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own vendor"
ON public.vendors FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins manage all vendors"
ON public.vendors FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Anyone can view approved vendors (for marketplace)
CREATE POLICY "Public can view approved vendors"
ON public.vendors FOR SELECT
TO anon, authenticated
USING (status = 'APROVADO'::vendor_status);