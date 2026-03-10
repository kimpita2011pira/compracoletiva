
-- Drop all existing restrictive policies on vendors
DROP POLICY IF EXISTS "Owner can select own vendor" ON public.vendors;
DROP POLICY IF EXISTS "Owner can insert own vendor" ON public.vendors;
DROP POLICY IF EXISTS "Owner can update own vendor" ON public.vendors;
DROP POLICY IF EXISTS "Admins manage all vendors" ON public.vendors;
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Owner can select own vendor" ON public.vendors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own vendor" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own vendor" ON public.vendors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all vendors" ON public.vendors
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Public can view approved vendors" ON public.vendors
  FOR SELECT TO anon, authenticated USING (status = 'APROVADO'::vendor_status);
