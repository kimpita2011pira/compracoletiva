-- Allow anyone to view closed/expired offers (VALIDADA, CANCELADA, ENCERRADA)
CREATE POLICY "Anyone can view closed offers"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('VALIDADA', 'CANCELADA', 'ENCERRADA'));

-- Allow anyone to view interest counts (read-only)
CREATE POLICY "Anyone can view interests"
  ON public.offer_interests
  FOR SELECT
  TO anon, authenticated
  USING (true);