
CREATE TABLE public.offer_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, offer_id)
);

ALTER TABLE public.offer_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interests"
  ON public.offer_interests
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors view interests on their offers"
  ON public.offer_interests
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM offers o
    JOIN vendors v ON v.id = o.vendor_id
    WHERE o.id = offer_interests.offer_id AND v.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage all interests"
  ON public.offer_interests
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role));
