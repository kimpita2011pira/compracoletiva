
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_wallet_id uuid,
  p_amount numeric,
  p_description text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE wallets 
  SET balance = balance + p_amount, updated_at = now() 
  WHERE id = p_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
  VALUES (p_wallet_id, 'DEPOSITO', p_amount, p_description, p_reference_id);
END;
$$;
