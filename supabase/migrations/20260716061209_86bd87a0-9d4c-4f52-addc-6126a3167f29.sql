
-- 1) Platform wallet transactions ledger
CREATE TABLE IF NOT EXISTS public.platform_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('COMISSAO_FRANQUIA','COMISSAO_SEM_FRANQUIA','TAXA_ADMIN','AJUSTE')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  source_label TEXT NOT NULL,
  offer_id UUID,
  franchise_id UUID,
  city TEXT,
  state TEXT,
  user_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_wtx_created ON public.platform_wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_wtx_type ON public.platform_wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_platform_wtx_franchise ON public.platform_wallet_transactions(franchise_id);

GRANT SELECT ON public.platform_wallet_transactions TO authenticated;
GRANT ALL ON public.platform_wallet_transactions TO service_role;

ALTER TABLE public.platform_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform wallet transactions"
  ON public.platform_wallet_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));

-- 2) Update validate_expired_offers to record platform income with source label
CREATE OR REPLACE FUNCTION public.validate_expired_offers()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  v_source_label text;
  v_platform_type text;
BEGIN
  FOR v_offer IN
    SELECT * FROM offers WHERE status = 'ATIVA' AND end_date < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_offer.sold_quantity >= v_offer.min_quantity THEN
      UPDATE offers SET status = 'VALIDADA' WHERE id = v_offer.id;

      SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
      FROM orders WHERE offer_id = v_offer.id AND status = 'RESERVADO';

      SELECT f.id, f.user_id, f.commission_rate, fc.city, fc.state INTO v_franchise
      FROM franchises f
      JOIN franchise_cities fc ON fc.franchise_id = f.id
      WHERE f.active = true AND fc.city = v_offer.city
      LIMIT 1;

      IF v_franchise.id IS NOT NULL THEN
        v_total_commission := ROUND(v_total_revenue * (v_franchise.commission_rate / 100.0), 2);
        v_platform_cut := ROUND(v_total_revenue * 0.01, 2);
        v_franchisee_cut := v_total_commission - v_platform_cut;
        v_source_label := 'Franquia ' || v_franchise.city || '/' || v_franchise.state;
        v_platform_type := 'COMISSAO_FRANQUIA';
      ELSE
        v_total_commission := ROUND(v_total_revenue * 0.10, 2);
        v_platform_cut := v_total_commission;
        v_franchisee_cut := 0;
        v_source_label := 'Sem franquia — ' || COALESCE(v_offer.city, 'cidade não informada');
        v_platform_type := 'COMISSAO_SEM_FRANQUIA';
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

        INSERT INTO platform_wallet_transactions
          (type, amount, source_label, offer_id, franchise_id, city, state, description)
        VALUES (
          v_platform_type, v_platform_cut, v_source_label,
          v_offer.id, v_franchise.id, v_offer.city,
          COALESCE(v_franchise.state, NULL),
          'Comissão da oferta "' || v_offer.title || '"'
        );
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

-- 3) Update admin fee charge to also record to platform ledger
CREATE OR REPLACE FUNCTION public.charge_admin_fee_current_month(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fee numeric;
  v_month date := date_trunc('month', now())::date;
  v_wallet public.wallets%ROWTYPE;
  v_exempt boolean;
  v_user_name text;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  IF public.has_role(_user_id, 'VENDEDOR')
     OR public.has_role(_user_id, 'ADMIN')
     OR public.has_role(_user_id, 'FRANQUEADO') THEN
    RETURN false;
  END IF;

  SELECT admin_fee_exempt, name INTO v_exempt, v_user_name FROM public.profiles WHERE id = _user_id;
  IF COALESCE(v_exempt, false) THEN RETURN false; END IF;

  SELECT monthly_admin_fee INTO v_fee FROM public.platform_settings WHERE id = true;
  IF v_fee IS NULL OR v_fee <= 0 THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.user_admin_fee_charges
             WHERE user_id = _user_id AND month = v_month) THEN
    RETURN false;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_fee THEN
    RETURN false;
  END IF;

  UPDATE public.wallets
    SET balance = balance - v_fee, updated_at = now()
    WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description)
  VALUES (v_wallet.id, 'TAXA_ADMIN'::public.transaction_type, v_fee,
          'Taxa administrativa mensal (' || to_char(v_month, 'MM/YYYY') || ')');

  INSERT INTO public.user_admin_fee_charges (user_id, month, amount)
  VALUES (_user_id, v_month, v_fee);

  UPDATE public.platform_wallet
    SET balance = balance + v_fee, updated_at = now()
    WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

  INSERT INTO public.platform_wallet_transactions
    (type, amount, source_label, user_id, description)
  VALUES (
    'TAXA_ADMIN', v_fee,
    'Taxa administrativa — ' || COALESCE(v_user_name, 'usuário'),
    _user_id,
    'Taxa mensal (' || to_char(v_month, 'MM/YYYY') || ')'
  );

  RETURN true;
END;
$function$;
