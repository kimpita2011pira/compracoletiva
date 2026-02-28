-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true);

-- Allow authenticated users to upload offer images
CREATE POLICY "Authenticated users can upload offer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'offer-images' AND auth.role() = 'authenticated');

-- Anyone can view offer images (public bucket)
CREATE POLICY "Anyone can view offer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-images');

-- Owners can update their offer images
CREATE POLICY "Users can update own offer images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'offer-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Owners can delete their offer images
CREATE POLICY "Users can delete own offer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'offer-images' AND auth.uid()::text = (storage.foldername(name))[1]);