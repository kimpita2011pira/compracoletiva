
CREATE OR REPLACE FUNCTION public.process_manual_refunds()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offer RECORD;
  v_order RECORD;
  v_cancelled integer := 0;
  v_refunded integer := 0;
BEGIN
  -- Identifica ofertas expiradas que não atingiram a meta e ainda estão como ATIVA
  FOR v_offer IN
    SELECT * FROM offers 
    WHERE status = 'ATIVA' AND end_date < now() AND sold_quantity < min_quantity
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Atualiza status da oferta para CANCELADA
    UPDATE offers SET status = 'CANCELADA' WHERE id = v_offer.id;
    v_cancelled := v_cancelled + 1;

    -- Processa estornos para cada pedido RESERVADO desta oferta
    FOR v_order IN
      SELECT o.*, w.id as wallet_id
      FROM orders o 
      JOIN wallets w ON w.user_id = o.user_id
      WHERE o.offer_id = v_offer.id AND o.status = 'RESERVADO'
    LOOP
      -- Devolve o dinheiro para a carteira
      UPDATE wallets SET balance = balance + v_order.total_price, updated_at = now() WHERE id = v_order.wallet_id;
      
      -- Registra a transação de estorno
      INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
      VALUES (v_order.wallet_id, 'ESTORNO', v_order.total_price,
        'Estorno: oferta "' || v_offer.title || '" cancelada', v_order.id);
      
      -- Atualiza status do pedido
      UPDATE orders SET status = 'ESTORNADO', updated_at = now() WHERE id = v_order.id;
      
      v_refunded := v_refunded + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('offers_cancelled', v_cancelled, 'orders_refunded', v_refunded);
END;
$$;
