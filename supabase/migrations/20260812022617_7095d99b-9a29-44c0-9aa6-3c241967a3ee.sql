-- 1) Add 'EXPIRADA' status to offer_status enum
ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'EXPIRADA';

-- 2) Create function to delete offer
CREATE OR REPLACE FUNCTION public.delete_vendor_offer(p_offer_id UUID)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_id UUID;
  v_order_count INTEGER;
BEGIN
  -- Verify ownership
  SELECT vendor_id INTO v_vendor_id FROM public.offers WHERE id = p_offer_id;
  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = v_vendor_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Check for existing orders
  SELECT count(*) INTO v_order_count FROM public.orders WHERE offer_id = p_offer_id;
  IF v_order_count > 0 THEN
    RAISE EXCEPTION 'Não é possível deletar uma oferta com pedidos associados';
  END IF;

  DELETE FROM public.offer_images WHERE offer_id = p_offer_id;
  DELETE FROM public.offer_interests WHERE offer_id = p_offer_id;
  DELETE FROM public.offers WHERE id = p_offer_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_vendor_offer(UUID) TO authenticated;

-- 3) Create function to reactivate offer
CREATE OR REPLACE FUNCTION public.reactivate_vendor_offer(p_offer_id UUID, p_new_end_date TIMESTAMPTZ)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_id UUID;
BEGIN
  SELECT vendor_id INTO v_vendor_id FROM public.offers WHERE id = p_offer_id;
  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = v_vendor_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.offers 
  SET status = 'ATIVA', end_date = p_new_end_date, updated_at = now()
  WHERE id = p_offer_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reactivate_vendor_offer(UUID, TIMESTAMPTZ) TO authenticated;

-- 4) Update validate_expired_offers to set status to 'EXPIRADA' instead of 'CANCELADA' when goal not met
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
  v_expired integer := 0;
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
          v_franchise.state,
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
      -- Change status to EXPIRADA
      UPDATE offers SET status = 'EXPIRADA' WHERE id = v_offer.id;

      FOR v_order IN
        SELECT o.*, w.id as wallet_id
        FROM orders o JOIN wallets w ON w.user_id = o.user_id
        WHERE o.offer_id = v_offer.id AND o.status = 'RESERVADO'
      LOOP
        UPDATE wallets SET balance = balance + v_order.total_price, updated_at = now() WHERE id = v_order.wallet_id;
        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
        VALUES (v_order.wallet_id, 'ESTORNO', v_order.total_price,
          'Estorno: oferta "' || v_offer.title || '" expirada', v_order.id);
        UPDATE orders SET status = 'ESTORNADO', updated_at = now() WHERE id = v_order.id;
      END LOOP;

      v_expired := v_expired + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('validated', v_validated, 'expired', v_expired);
END;
$function$;