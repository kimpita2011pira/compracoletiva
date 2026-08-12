
CREATE OR REPLACE FUNCTION public.process_franchisee_commission(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_offer RECORD;
    v_franchise RECORD;
    v_franchisee_wallet_id uuid;
    v_total_revenue numeric;
    v_franchisee_rate numeric;
    v_franchisee_amount numeric;
    v_description text;
BEGIN
    -- Busca a oferta
    SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
    
    -- Busca a franquia associada à cidade da oferta
    SELECT f.* INTO v_franchise 
    FROM franchises f
    JOIN city_licenses cl ON cl.franchise_id = f.id
    WHERE cl.city = v_offer.city AND cl.state = v_offer.state
    LIMIT 1;

    -- Se não houver franquia, não há comissão de franqueado a processar
    IF v_franchise IS NULL THEN
        RETURN;
    END IF;

    -- Busca a carteira do franqueado
    SELECT id INTO v_franchisee_wallet_id 
    FROM wallets 
    WHERE user_id = v_franchise.user_id;

    IF v_franchisee_wallet_id IS NULL THEN
        RETURN;
    END IF;

    -- Calcula a receita total da oferta
    SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
    FROM orders 
    WHERE offer_id = p_offer_id AND status = 'CONFIRMADO';

    -- Taxa do franqueado (Total - 1% da plataforma)
    v_franchisee_rate := v_franchise.commission_rate - 1;
    v_franchisee_amount := ROUND(v_total_revenue * (v_franchisee_rate / 100.0), 2);

    IF v_franchisee_amount > 0 THEN
        -- Formata o descritivo similar ao do vendedor (solicitado pelo usuário)
        v_description := 'Crédito Comissão Oferta "' || v_offer.title || '" - ' || v_offer.city || '/' || v_offer.state;

        -- Credita na carteira do franqueado
        UPDATE wallets 
        SET balance = balance + v_franchisee_amount, 
            updated_at = now() 
        WHERE id = v_franchisee_wallet_id;

        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
        VALUES (v_franchisee_wallet_id, 'CREDITO', v_franchisee_amount, v_description, p_offer_id);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_franchisee_commission(uuid) TO service_role;
