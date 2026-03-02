
-- Create offer_images table for multiple images per offer
CREATE TABLE public.offer_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offer_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images of active offers
CREATE POLICY "Anyone can view offer images"
ON public.offer_images
FOR SELECT
USING (true);

-- Vendors can manage images of their own offers
CREATE POLICY "Vendors manage own offer images"
ON public.offer_images
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.id = offer_images.offer_id AND v.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.id = offer_images.offer_id AND v.user_id = auth.uid()
  )
);

-- Admins can manage all offer images
CREATE POLICY "Admins manage all offer images"
ON public.offer_images
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Index for fast lookups
CREATE INDEX idx_offer_images_offer_id ON public.offer_images(offer_id, position);
