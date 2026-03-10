
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active banners (public feature)
CREATE POLICY "Anyone can view active banners"
ON public.promo_banners
FOR SELECT
TO anon, authenticated
USING (active = true);

-- Admins can manage all banners
CREATE POLICY "Admins manage banners"
ON public.promo_banners
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Seed with default messages
INSERT INTO public.promo_banners (message, position) VALUES
  ('🔥 Ofertas imperdíveis com até 60% de desconto!', 0),
  ('🛒 Quanto mais gente compra, mais todo mundo economiza!', 1),
  ('🎉 Novos produtos adicionados diariamente — confira!', 2),
  ('💰 Cadastre-se e ganhe bônus na sua primeira compra!', 3);
