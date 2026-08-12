
-- 1. Unificar as carteiras da plataforma se houver mais de uma
DO $$
DECLARE
    v_main_id uuid;
    v_total_balance numeric;
BEGIN
    -- Busca o ID da primeira carteira (usando id como fallback de ordenação já que created_at não existe)
    SELECT id INTO v_main_id FROM public.platform_wallet ORDER BY id ASC LIMIT 1;
    
    -- Se não houver nenhuma, cria uma
    IF v_main_id IS NULL THEN
        INSERT INTO public.platform_wallet (balance) VALUES (0) RETURNING id INTO v_main_id;
    END IF;

    -- Soma todos os saldos de todas as linhas que por ventura existam
    SELECT SUM(balance) INTO v_total_balance FROM public.platform_wallet;
    
    -- Remove as duplicatas e atualiza a principal com o total
    DELETE FROM public.platform_wallet WHERE id != v_main_id;
    UPDATE public.platform_wallet SET balance = COALESCE(v_total_balance, 0), updated_at = now() WHERE id = v_main_id;
END $$;

-- 2. Atualizar process_platform_withdrawal para garantir singleton e segurança
CREATE OR REPLACE FUNCTION public.process_platform_withdrawal(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_admin_id uuid;
    v_admin_wallet_id uuid;
    v_platform_wallet_id uuid;
    v_current_balance numeric;
BEGIN
    -- 1. Verificar se o usuário é ADMIN
    v_admin_id := auth.uid();
    IF NOT public.has_role(v_admin_id, 'ADMIN') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acesso negado: apenas administradores podem realizar saques do caixa da plataforma');
    END IF;

    -- 2. Verificar saldo do caixa da plataforma (garante pegar a única)
    SELECT id, balance INTO v_platform_wallet_id, v_current_balance 
    FROM platform_wallet 
    LIMIT 1 
    FOR UPDATE;

    IF v_platform_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Caixa da plataforma não inicializado');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo insuficiente no caixa da plataforma');
    END IF;

    -- 3. Buscar carteira do admin
    SELECT id INTO v_admin_wallet_id FROM wallets WHERE user_id = v_admin_id FOR UPDATE;
    IF v_admin_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Carteira do administrador não encontrada');
    END IF;

    -- 4. Deduzir do caixa da plataforma
    UPDATE platform_wallet 
    SET balance = balance - p_amount, updated_at = now() 
    WHERE id = v_platform_wallet_id;

    -- 5. Registrar transação na plataforma
    INSERT INTO platform_wallet_transactions (type, amount, source_label, description)
    VALUES ('SAQUE_PLATAFORMA', p_amount, 'Retirada Admin', 'Transferência para carteira pessoal do administrador');

    -- 6. Creditar na carteira do admin
    UPDATE wallets 
    SET balance = balance + p_amount, updated_at = now() 
    WHERE id = v_admin_wallet_id;

    -- 7. Registrar transação na carteira do admin
    INSERT INTO wallet_transactions (wallet_id, type, amount, description)
    VALUES (v_admin_wallet_id, 'CREDITO', p_amount, 'Transferência do Caixa da Plataforma');

    RETURN jsonb_build_object('success', true, 'new_platform_balance', v_current_balance - p_amount);
END;
$$;

-- 3. Ajustar fix_vendor_offer_credits para sempre usar a mesma carteira
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
    v_platform_wallet_id uuid;
    v_already_credited boolean;
BEGIN
    -- Busca a oferta
    SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Oferta não encontrada');
    END IF;

    -- Busca a carteira do vendedor
    SELECT w.id INTO v_vendor_wallet_id
    FROM wallets w JOIN vendors v ON v.user_id = w.user_id
    WHERE v.id = v_offer.vendor_id;

    IF v_vendor_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Carteira do vendedor não encontrada');
    END IF;

    -- Verifica se já houve crédito
    SELECT EXISTS (
        SELECT 1 FROM wallet_transactions 
        WHERE wallet_id = v_vendor_wallet_id 
        AND reference_id = p_offer_id
        AND type = 'CREDITO'
    ) INTO v_already_credited;

    IF v_already_credited THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta oferta já foi creditada ao vendedor anteriormente');
    END IF;

    -- Calcula receita total dos pedidos confirmados/reservados
    SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
    FROM orders WHERE offer_id = p_offer_id AND status IN ('CONFIRMADO', 'RESERVADO');

    IF v_total_revenue = 0 THEN
         RETURN jsonb_build_object('success', false, 'message', 'Não há pedidos para creditar');
    END IF;

    -- 10% de comissão padrão
    v_total_commission := ROUND(v_total_revenue * 0.10, 2);
    v_vendor_amount := v_total_revenue - v_total_commission;
    v_platform_cut := v_total_commission;

    -- Atualiza pedidos
    UPDATE orders SET status = 'CONFIRMADO', updated_at = now() 
    WHERE offer_id = p_offer_id AND status = 'RESERVADO';

    -- Crédito Vendedor
    UPDATE wallets SET balance = balance + v_vendor_amount, updated_at = now() WHERE id = v_vendor_wallet_id;
    INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
    VALUES (v_vendor_wallet_id, 'CREDITO', v_vendor_amount,
      'Crédito Oferta "' || v_offer.title || '" - tx adm', p_offer_id);

    -- Crédito Plataforma (Garantindo que use a carteira única)
    SELECT id INTO v_platform_wallet_id FROM platform_wallet LIMIT 1;
    
    IF v_platform_wallet_id IS NOT NULL THEN
        UPDATE platform_wallet 
        SET balance = balance + v_platform_cut, updated_at = now()
        WHERE id = v_platform_wallet_id;

        INSERT INTO platform_wallet_transactions
          (type, amount, source_label, offer_id, description)
        VALUES (
          'COMISSAO_SEM_FRANQUIA', v_platform_cut, 'Correção Manual',
          p_offer_id, 'Comissão ajustada da oferta "' || v_offer.title || '"'
        );
    END IF;
    
    -- Status da oferta
    UPDATE offers SET status = 'VALIDADA' WHERE id = p_offer_id;

    RETURN jsonb_build_object(
        'success', true, 
        'vendor_credited', v_vendor_amount, 
        'platform_credited', v_platform_cut
    );
END;
$$;
