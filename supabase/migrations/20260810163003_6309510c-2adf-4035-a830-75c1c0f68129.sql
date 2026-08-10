-- Função para registrar reconciliação externa
CREATE OR REPLACE FUNCTION public.run_external_reconciliation(p_discrepancies jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report_id uuid;
    v_total integer;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    v_total := jsonb_array_length(p_discrepancies);

    INSERT INTO reconciliation_reports (discrepancies, total_discrepancies)
    VALUES (p_discrepancies, v_total)
    RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;
$$;

-- Função para testar notificações de comissão
CREATE OR REPLACE FUNCTION public.test_commission_notification()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_wallet_id uuid;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Simula uma transação de comissão na própria carteira do admin para teste
    SELECT id INTO v_admin_wallet_id FROM wallets WHERE user_id = auth.uid();
    
    IF v_admin_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Carteira do administrador não encontrada';
    END IF;

    INSERT INTO wallet_transactions (wallet_id, type, amount, description)
    VALUES (v_admin_wallet_id, 'COMISSAO', 0.01, 'Teste de notificação de comissão');

    RETURN true;
END;
$$;
