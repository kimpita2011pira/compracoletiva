
CREATE OR REPLACE FUNCTION public.fix_vendor_offer_credits(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_offer RECORD;
    v_total_revenue numeric;
    v_total_commission numeric;
    v_platform_cut numeric;
    v_vendor_amount numeric;
    v_vendor_wallet_id uuid;
    v_already_credited boolean;
BEGIN
    -- Verifica se quem chama é admin
    IF NOT public.has_role(auth.uid(), 'ADMIN') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Busca a oferta (deve estar VALIDADA)
    SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada');
    END IF;

    -- Permite processar se estiver ATIVA (expirada) ou VALIDADA
    IF v_offer.status NOT IN ('ATIVA', 'VALIDADA') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Oferta deve estar em status ATIVA (expirada) ou VALIDADA');
    END IF;

    -- Verifica se já houve crédito para esta oferta na carteira do vendedor
    SELECT w.id INTO v_vendor_wallet_id
    FROM wallets w JOIN vendors v ON v.user_id = w.user_id
    WHERE v.id = v_offer.vendor_id;

    IF v_vendor_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Carteira do vendedor não encontrada');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM wallet_transactions 
        WHERE wallet_id = v_vendor_wallet_id 
        AND reference_id = p_offer_id
        AND type = 'CREDITO'
    ) INTO v_already_credited;

    IF v_already_credited THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta oferta já foi creditada ao vendedor anteriormente');
    END IF;

    -- Calcula valores (10% padrão)
    SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
    FROM orders WHERE offer_id = p_offer_id AND status IN ('CONFIRMADO', 'RESERVADO');

    IF v_total_revenue = 0 THEN
         RETURN jsonb_build_object('success', false, 'message', 'Não há pedidos reservados ou confirmados para esta oferta');
    END IF;

    -- Atualiza pedidos para CONFIRMADO se necessário
    UPDATE orders SET status = 'CONFIRMADO', updated_at = now() 
    WHERE offer_id = p_offer_id AND status = 'RESERVADO';

    v_total_commission := ROUND(v_total_revenue * 0.10, 2);
    v_vendor_amount := v_total_revenue - v_total_commission;
    v_platform_cut := v_total_commission;

    -- Crédito Vendedor - Atualizado com descritivo solicitado
    UPDATE wallets SET balance = balance + v_vendor_amount, updated_at = now() WHERE id = v_vendor_wallet_id;
    INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
    VALUES (v_vendor_wallet_id, 'CREDITO', v_vendor_amount,
      'Crédito Oferta "' || v_offer.title || '" - tx adm', p_offer_id);

    -- Crédito Plataforma
    UPDATE platform_wallet SET balance = balance + v_platform_cut, updated_at = now()
    WHERE id = (SELECT id FROM platform_wallet LIMIT 1);

    INSERT INTO platform_wallet_transactions
      (type, amount, source_label, offer_id, description)
    VALUES (
      'COMISSAO_SEM_FRANQUIA', v_platform_cut, 'Correção Manual',
      p_offer_id, 'Comissão ajustada da oferta "' || v_offer.title || '"'
    );
    
    -- Se a oferta ainda estava ATIVA, move para VALIDADA
    IF v_offer.status = 'ATIVA' THEN
        UPDATE offers SET status = 'VALIDADA' WHERE id = p_offer_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'vendor_credited', v_vendor_amount, 
        'platform_credited', v_platform_cut
    );
END;
$$;
