CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_unique_deposit_description
ON public.wallet_transactions (wallet_id, description)
WHERE type = 'DEPOSITO'::public.transaction_type AND description IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_deposit_once(
  p_wallet_id uuid,
  p_amount numeric,
  p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_exists boolean;
BEGIN
  IF p_wallet_id IS NULL THEN
    RAISE EXCEPTION 'wallet id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than zero';
  END IF;

  IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
    RAISE EXCEPTION 'description is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.wallets WHERE id = p_wallet_id
  ) INTO v_wallet_exists;

  IF NOT v_wallet_exists THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE wallet_id = p_wallet_id
      AND type = 'DEPOSITO'::public.transaction_type
      AND description = p_description
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description)
  VALUES (p_wallet_id, 'DEPOSITO'::public.transaction_type, p_amount, p_description);

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_deposit_once(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_deposit_once(uuid, numeric, text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_deposit_once(uuid, numeric, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_deposit_once(uuid, numeric, text) TO service_role;

NOTIFY pgrst, 'reload schema';