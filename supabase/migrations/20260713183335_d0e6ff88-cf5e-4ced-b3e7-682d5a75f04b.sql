CREATE OR REPLACE FUNCTION public.reserve_offer(
  p_offer_id uuid,
  p_quantity integer,
  p_delivery_type delivery_type,
  p_address_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_offer offers%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_unit_price numeric;
  v_total_price numeric;
  v_order_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  IF p_quantity > 10000 THEN
    RAISE EXCEPTION 'Quantidade excede o máximo permitido';
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oferta não encontrada';
  END IF;
  IF v_offer.status <> 'ATIVA' THEN
    RAISE EXCEPTION 'Esta oferta não está mais ativa';
  END IF;
  IF now() > v_offer.end_date THEN
    RAISE EXCEPTION 'Esta oferta já expirou';
  END IF;

  IF v_offer.max_per_user IS NOT NULL THEN
    DECLARE
      v_existing_qty integer;
    BEGIN
      SELECT COALESCE(SUM(quantity), 0) INTO v_existing_qty
      FROM orders
      WHERE offer_id = p_offer_id AND user_id = v_user_id AND status IN ('RESERVADO', 'CONFIRMADO');

      IF (v_existing_qty + p_quantity) > v_offer.max_per_user THEN
        RAISE EXCEPTION 'Limite máximo por usuário excedido (máx: %)', v_offer.max_per_user;
      END IF;
    END;
  END IF;

  IF p_delivery_type = 'DELIVERY' AND (v_offer.delivery_available IS NOT TRUE) THEN
    RAISE EXCEPTION 'Entrega não disponível para esta oferta';
  END IF;
  IF p_delivery_type = 'RETIRADA' AND (v_offer.pickup_available IS NOT TRUE) THEN
    RAISE EXCEPTION 'Retirada não disponível para esta oferta';
  END IF;

  v_unit_price := v_offer.offer_price;
  v_total_price := v_unit_price * p_quantity;
  IF p_delivery_type = 'DELIVERY' AND v_offer.delivery_fee IS NOT NULL THEN
    v_total_price := v_total_price + v_offer.delivery_fee;
  END IF;

  IF v_total_price <= 0 THEN
    RAISE EXCEPTION 'Total inválido';
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada. Faça um depósito primeiro.';
  END IF;
  IF v_wallet.balance < v_total_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Necessário: R$ %, Disponível: R$ %', v_total_price, v_wallet.balance;
  END IF;

  INSERT INTO orders (user_id, offer_id, quantity, unit_price, total_price, delivery_type, address_id, status)
  VALUES (v_user_id, p_offer_id, p_quantity, v_unit_price, v_total_price, p_delivery_type, p_address_id, 'RESERVADO')
  RETURNING id INTO v_order_id;

  UPDATE wallets SET balance = balance - v_total_price, updated_at = now() WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (v_wallet.id, 'RESERVA', v_total_price, 'Reserva para oferta: ' || v_offer.title, v_order_id);

  UPDATE offers SET sold_quantity = sold_quantity + p_quantity WHERE id = p_offer_id;

  RETURN v_order_id;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_quantity_positive_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_quantity_positive_check CHECK (quantity > 0) NOT VALID;
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can upload offer images" ON storage.objects;

CREATE POLICY "Vendors can upload offer images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
);