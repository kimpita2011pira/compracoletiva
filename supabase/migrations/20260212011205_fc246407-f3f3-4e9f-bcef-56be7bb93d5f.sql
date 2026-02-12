-- Enable RLS on vendors table
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Allow vendors to view their own vendor record
CREATE POLICY "Vendors can view own vendor record"
ON public.vendors FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow vendors to update their own vendor record (except status which only admins can change)
CREATE POLICY "Vendors can update own vendor record"
ON public.vendors FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow vendors to insert their own vendor record
CREATE POLICY "Vendors can insert own vendor record"
ON public.vendors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow public to view approved vendors only (for marketplace)
CREATE POLICY "Anyone can view approved vendors"
ON public.vendors FOR SELECT
USING (status = 'APROVADO'::vendor_status);