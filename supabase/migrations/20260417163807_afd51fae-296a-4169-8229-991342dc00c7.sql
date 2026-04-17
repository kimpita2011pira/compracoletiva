-- Franchise system tables
CREATE TABLE public.franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  commission_rate numeric NOT NULL DEFAULT 10 CHECK (commission_rate >= 1 AND commission_rate <= 50),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.franchise_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  city varchar NOT NULL,
  state varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, state)
);

CREATE INDEX idx_franchise_cities_franchise ON public.franchise_cities(franchise_id);
CREATE INDEX idx_franchise_cities_location ON public.franchise_cities(city, state);

-- Add FRANQUEADO role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'FRANQUEADO';

ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_cities ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is franchisee for a city
CREATE OR REPLACE FUNCTION public.is_franchisee_for_city(_user_id uuid, _city varchar, _state varchar)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM franchises f
    JOIN franchise_cities fc ON fc.franchise_id = f.id
    WHERE f.user_id = _user_id
      AND f.active = true
      AND fc.city = _city
      AND fc.state = _state
  )
$$;

-- Helper: get all cities of a franchisee
CREATE OR REPLACE FUNCTION public.get_franchisee_cities(_user_id uuid)
RETURNS TABLE(city varchar, state varchar)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fc.city, fc.state
  FROM franchises f
  JOIN franchise_cities fc ON fc.franchise_id = f.id
  WHERE f.user_id = _user_id AND f.active = true
$$;

-- RLS: franchises
CREATE POLICY "Admins manage all franchises" ON public.franchises
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Franchisees view own franchise" ON public.franchises
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS: franchise_cities
CREATE POLICY "Admins manage franchise cities" ON public.franchise_cities
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Franchisees view own cities" ON public.franchise_cities
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM franchises f WHERE f.id = franchise_cities.franchise_id AND f.user_id = auth.uid())
  );

-- Public can view to know which cities have franchises (for routing logic)
CREATE POLICY "Anyone view franchise cities" ON public.franchise_cities
  FOR SELECT TO anon, authenticated USING (true);

-- Trigger updated_at
CREATE TRIGGER update_franchises_updated_at
  BEFORE UPDATE ON public.franchises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Extend RLS so franchisees can manage vendors/offers/banners/withdrawals in their cities
CREATE POLICY "Franchisees manage vendors in their cities" ON public.vendors
  FOR ALL TO authenticated
  USING (is_franchisee_for_city(auth.uid(), vendors.city, ''))
  WITH CHECK (is_franchisee_for_city(auth.uid(), vendors.city, ''));

CREATE POLICY "Franchisees manage offers in their cities" ON public.offers
  FOR ALL TO authenticated
  USING (is_franchisee_for_city(auth.uid(), offers.city, ''))
  WITH CHECK (is_franchisee_for_city(auth.uid(), offers.city, ''));

CREATE POLICY "Franchisees manage withdrawals in cities" ON public.withdrawal_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = withdrawal_requests.vendor_id
        AND is_franchisee_for_city(auth.uid(), v.city, '')
    )
  );

CREATE POLICY "Franchisees view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM franchises WHERE user_id = auth.uid() AND active = true));

CREATE POLICY "Franchisees insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND EXISTS (SELECT 1 FROM franchises WHERE user_id = auth.uid() AND active = true));

-- Update validate_expired_offers to use franchise commission split
CREATE OR REPLACE FUNCTION public.validate_expired_offers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_offer RECORD;
  v_order RECORD;
  v_vendor_wallet_id uuid;
  v_franchisee_wallet_id uuid;
  v_total_revenue numeric;
  v_total_commission numeric;
  v_platform_cut numeric;
  v_franchisee_cut numeric;
  v_vendor_amount numeric;
  v_franchise RECORD;
  v_validated integer := 0;
  v_cancelled integer := 0;
BEGIN
  FOR v_offer IN
    SELECT * FROM offers WHERE status = 'ATIVA' AND end_date < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_offer.sold_quantity >= v_offer.min_quantity THEN
      UPDATE offers SET status = 'VALIDADA' WHERE id = v_offer.id;

      SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
      FROM orders WHERE offer_id = v_offer.id AND status = 'RESERVADO';

      -- Look up franchise for offer city
      SELECT f.id, f.user_id, f.commission_rate INTO v_franchise
      FROM franchises f
      JOIN franchise_cities fc ON fc.franchise_id = f.id
      WHERE f.active = true AND fc.city = v_offer.city
      LIMIT 1;

      IF v_franchise.id IS NOT NULL THEN
        v_total_commission := ROUND(v_total_revenue * (v_franchise.commission_rate / 100.0), 2);
        v_platform_cut := ROUND(v_total_revenue * 0.01, 2);
        v_franchisee_cut := v_total_commission - v_platform_cut;
      ELSE
        v_total_commission := ROUND(v_total_revenue * 0.10, 2);
        v_platform_cut := v_total_commission;
        v_franchisee_cut := 0;
      END IF;

      v_vendor_amount := v_total_revenue - v_total_commission;

      UPDATE orders SET status = 'CONFIRMADO', updated_at = now()
      WHERE offer_id = v_offer.id AND status = 'RESERVADO';

      SELECT w.id INTO v_vendor_wallet_id
      FROM wallets w JOIN vendors v ON v.user_id = w.user_id
      WHERE v.id = v_offer.vendor_id;

      IF v_vendor_wallet_id IS NOT NULL AND v_vendor_amount > 0 THEN
        UPDATE wallets SET balance = balance + v_vendor_amount, updated_at = now() WHERE id = v_vendor_wallet_id;
        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
        VALUES (v_vendor_wallet_id, 'CREDITO', v_vendor_amount,
          'Venda validada: "' || v_offer.title || '"', v_offer.id);
      END IF;

      IF v_platform_cut > 0 THEN
        UPDATE platform_wallet SET balance = balance + v_platform_cut, updated_at = now()
        WHERE id = (SELECT id FROM platform_wallet LIMIT 1);
      END IF;

      IF v_franchisee_cut > 0 AND v_franchise.user_id IS NOT NULL THEN
        SELECT id INTO v_franchisee_wallet_id FROM wallets WHERE user_id = v_franchise.user_id;
        IF v_franchisee_wallet_id IS NOT NULL THEN
          UPDATE wallets SET balance = balance + v_franchisee_cut, updated_at = now() WHERE id = v_franchisee_wallet_id;
          INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
          VALUES (v_franchisee_wallet_id, 'COMISSAO', v_franchisee_cut,
            'Comissão franquia: "' || v_offer.title || '"', v_offer.id);
        END IF;
      END IF;

      v_validated := v_validated + 1;
    ELSE
      UPDATE offers SET status = 'CANCELADA' WHERE id = v_offer.id;

      FOR v_order IN
        SELECT o.*, w.id as wallet_id
        FROM orders o JOIN wallets w ON w.user_id = o.user_id
        WHERE o.offer_id = v_offer.id AND o.status = 'RESERVADO'
      LOOP
        UPDATE wallets SET balance = balance + v_order.total_price, updated_at = now() WHERE id = v_order.wallet_id;
        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
        VALUES (v_order.wallet_id, 'ESTORNO', v_order.total_price,
          'Estorno: oferta "' || v_offer.title || '" cancelada', v_order.id);
        UPDATE orders SET status = 'ESTORNADO', updated_at = now() WHERE id = v_order.id;
      END LOOP;

      v_cancelled := v_cancelled + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('validated', v_validated, 'cancelled', v_cancelled);
END;
$function$;