-- Nova tabela para relatórios de reconciliação
CREATE TABLE public.reconciliation_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    discrepancies jsonb NOT NULL,
    total_discrepancies integer DEFAULT 0,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved'))
);

GRANT SELECT, INSERT, UPDATE ON public.reconciliation_reports TO authenticated;
GRANT ALL ON public.reconciliation_reports TO service_role;

ALTER TABLE public.reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reports"
ON public.reconciliation_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Função de Reconciliação
CREATE OR REPLACE FUNCTION public.run_wallet_reconciliation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report_id uuid;
    v_discrepancies jsonb := '[]'::jsonb;
    v_total integer := 0;
    v_rec RECORD;
BEGIN
    -- Verifica se quem chama é admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Busca divergências: Saldo da carteira vs Soma de transações
    FOR v_rec IN 
        SELECT 
            w.id as wallet_id,
            w.user_id,
            w.balance as current_balance,
            COALESCE(SUM(CASE 
                WHEN t.type IN ('DEPOSITO', 'CREDITO', 'ESTORNO') THEN t.amount 
                ELSE -t.amount 
            END), 0) as calculated_balance,
            p.name as user_name
        FROM wallets w
        JOIN profiles p ON p.id = w.user_id
        LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
        GROUP BY w.id, w.user_id, w.balance, p.name
        HAVING ABS(w.balance - COALESCE(SUM(CASE 
            WHEN t.type IN ('DEPOSITO', 'CREDITO', 'ESTORNO') THEN t.amount 
            ELSE -t.amount 
        END), 0)) > 0.01
    LOOP
        v_discrepancies := v_discrepancies || jsonb_build_object(
            'wallet_id', v_rec.wallet_id,
            'user_id', v_rec.user_id,
            'user_name', v_rec.user_name,
            'current_balance', v_rec.current_balance,
            'calculated_balance', v_rec.calculated_balance,
            'diff', v_rec.current_balance - v_rec.calculated_balance,
            'type', 'balance_mismatch'
        );
        v_total := v_total + 1;
    END LOOP;

    -- Busca divergências: Pedidos Confimados/Estornados sem transação correspondente
    -- (Este é um exemplo básico, pode ser expandido conforme a regra de negócio)

    INSERT INTO reconciliation_reports (discrepancies, total_discrepancies)
    VALUES (v_discrepancies, v_total)
    RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;
$$;

-- Melhorar o trigger de notificação para incluir split de comissão e estornos automáticos
CREATE OR REPLACE FUNCTION public.notify_commission_and_refunds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vendor_user_id uuid;
    v_admin_id uuid;
    v_offer_title text;
    v_franchise_name text;
BEGIN
    -- 1. Notificação de Split de Comissão (90/10)
    -- Triggered by wallet_transactions of type 'COMISSAO' (que no sistema parece ser o débito da comissão do vendedor)
    IF (TG_OP = 'INSERT' AND NEW.type = 'COMISSAO') THEN
        -- O wallet_id aqui é a carteira do vendedor
        SELECT user_id INTO v_vendor_user_id FROM wallets WHERE id = NEW.wallet_id;
        
        INSERT INTO notifications (user_id, title, message)
        VALUES (
            v_vendor_user_id, 
            'Comissão processada 💸', 
            'A comissão da sua venda foi processada. Você recebeu 90% do valor líquido.'
        );

        -- Notifica Admin
        SELECT id INTO v_admin_id FROM user_roles WHERE role = 'admin' LIMIT 1;
        IF v_admin_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, message)
            VALUES (
                v_admin_id, 
                'Nova comissão recebida 📈', 
                'Uma nova venda foi validada com split de 10% para a plataforma.'
            );
        END IF;
    END IF;

    -- 2. Notificação de Estorno Automático
    IF (TG_OP = 'INSERT' AND NEW.type = 'ESTORNO') THEN
        SELECT user_id INTO v_vendor_user_id FROM wallets WHERE id = NEW.wallet_id;
        
        INSERT INTO notifications (user_id, title, message)
        VALUES (
            v_vendor_user_id, 
            'Valor estornado 🔄', 
            'Um valor foi devolvido à sua carteira automaticamente devido ao cancelamento de uma reserva.'
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_notify_wallet_tx
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_commission_and_refunds();
