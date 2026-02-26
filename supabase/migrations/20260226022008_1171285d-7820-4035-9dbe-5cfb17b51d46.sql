
-- Allow authenticated users to view basic profile info (name, avatar) for reviews
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
