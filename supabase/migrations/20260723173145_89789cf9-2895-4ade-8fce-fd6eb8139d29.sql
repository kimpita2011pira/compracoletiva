-- RLS for storage.objects in platform-settings bucket

-- Allow public read
CREATE POLICY "Public read platform settings"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-settings');

-- Allow admins to manage files
CREATE POLICY "Admins can manage platform settings files"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'platform-settings' AND 
    public.has_role(auth.uid(), 'ADMIN')
)
WITH CHECK (
    bucket_id = 'platform-settings' AND 
    public.has_role(auth.uid(), 'ADMIN')
);
