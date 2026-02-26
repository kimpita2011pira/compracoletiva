
-- Create reviews table for offer ratings
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one review per user per offer
CREATE UNIQUE INDEX idx_reviews_user_offer ON public.reviews (user_id, offer_id);

-- Index for querying reviews by offer
CREATE INDEX idx_reviews_offer_id ON public.reviews (offer_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can insert their own review
CREATE POLICY "Users can insert own review"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
CREATE POLICY "Users can update own review"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own review
CREATE POLICY "Users can delete own review"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);
