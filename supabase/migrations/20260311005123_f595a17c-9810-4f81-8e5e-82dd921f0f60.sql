
-- Function to validate expired offers: split payments 90/10
CREATE OR REPLACE FUNCTION public.validate_expired_offers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offer RECORD;
  v_order RECORD;
  v_vendor_wallet_id uuid;
  v_total_revenue numeric;
  v_commission numeric;
  v_vendor_amount numeric;
  v_validated integer := 0;
  v_cancelled integer := 0;
BEGIN
  -- Find all ATIVA offers past their end_date
  FOR v_offer IN
    SELECT * FROM offers
    WHERE status = 'ATIVA' AND end_date < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_offer.sold_quantity >= v_offer.min_quantity THEN
      -- ✅ VALIDATE: min quantity reached
      UPDATE offers SET status = 'VALIDADA' WHERE id = v_offer.id;

      -- Calculate total revenue from RESERVADO orders
      SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
      FROM orders WHERE offer_id = v_offer.id AND status = 'RESERVADO';

      -- Commission split
      v_commission := ROUND(v_total_revenue * 0.10, 2);
      v_vendor_amount := v_total_revenue - v_commission;

      -- Confirm all RESERVADO orders
      UPDATE orders SET status = 'CONFIRMADO', updated_at = now()
      WHERE offer_id = v_offer.id AND status = 'RESERVADO';

      -- Credit vendor wallet (get wallet via vendor user_id)
      SELECT w.id INTO v_vendor_wallet_id
      FROM wallets w
      JOIN vendors v ON v.user_id = w.user_id
      WHERE v.id = v_offer.vendor_id;

      IF v_vendor_wallet_id IS NOT NULL AND v_vendor_amount > 0 THEN
        UPDATE wallets SET balance = balance + v_vendor_amount, updated_at = now()
        WHERE id = v_vendor_wallet_id;

        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
        VALUES (v_vendor_wallet_id, 'CREDITO', v_vendor_amount,
          'Venda validada: "' || v_offer.title || '" (90%)', v_offer.id);
      END IF;

      -- Credit platform wallet (10% commission)
      IF v_commission > 0 THEN
        UPDATE platform_wallet SET balance = balance + v_commission, updated_at = now()
        WHERE id = (SELECT id FROM platform_wallet LIMIT 1);

        -- Also record as a transaction in the first admin's wallet for visibility
        -- Or just update platform_wallet (already done above)
      END IF;

      v_validated := v_validated + 1;
    ELSE
      -- ❌ CANCEL: min quantity NOT reached
      UPDATE offers SET status = 'CANCELADA' WHERE id = v_offer.id;

      -- Refund all RESERVADO orders
      FOR v_order IN
        SELECT o.*, w.id as wallet_id
        FROM orders o
        JOIN wallets w ON w.user_id = o.user_id
        WHERE o.offer_id = v_offer.id AND o.status = 'RESERVADO'
      LOOP
        -- Refund wallet
        UPDATE wallets SET balance = balance + v_order.total_price, updated_at = now()
        WHERE id = v_order.wallet_id;

        -- Record refund transaction
        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
        VALUES (v_order.wallet_id, 'ESTORNO', v_order.total_price,
          'Estorno: oferta "' || v_offer.title || '" cancelada', v_order.id);

        -- Update order status
        UPDATE orders SET status = 'ESTORNADO', updated_at = now()
        WHERE id = v_order.id;
      END LOOP;

      v_cancelled := v_cancelled + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('validated', v_validated, 'cancelled', v_cancelled);
END;
$$;

-- Ensure platform_wallet has at least one row
INSERT INTO platform_wallet (id, balance)
VALUES (gen_random_uuid(), 0)
ON CONFLICT DO NOTHING;
