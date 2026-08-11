-- Ensure table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reconciliation_reports') THEN
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
        
        -- Use 'ADMIN' uppercase to match app_role enum
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reconciliation_reports' AND policyname = 'Admins can view all reports') THEN
            CREATE POLICY "Admins can view all reports"
            ON public.reconciliation_reports FOR SELECT
            TO authenticated
            USING (public.has_role(auth.uid(), 'ADMIN'));
        END IF;
    END IF;
END $$;

-- Drop and recreate the RPC with correct grants and logic
DROP FUNCTION IF EXISTS public.run_wallet_reconciliation();

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
    -- Check if user is admin - case sensitive enum 'ADMIN'
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Search for balance discrepancies
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
        FROM public.wallets w
        JOIN public.profiles p ON p.id = w.user_id
        LEFT JOIN public.wallet_transactions t ON t.wallet_id = w.id
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

    INSERT INTO public.reconciliation_reports (discrepancies, total_discrepancies)
    VALUES (v_discrepancies, v_total)
    RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_wallet_reconciliation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_wallet_reconciliation() TO service_role;
