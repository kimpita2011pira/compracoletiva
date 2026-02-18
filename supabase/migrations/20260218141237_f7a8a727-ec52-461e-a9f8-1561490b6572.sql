
-- Trigger to notify the user when a deposit is credited to their wallet
CREATE OR REPLACE FUNCTION public.notify_user_on_deposit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only fire for DEPOSITO transactions
  IF NEW.type <> 'DEPOSITO' THEN
    RETURN NEW;
  END IF;

  -- Get the wallet owner
  SELECT user_id INTO v_user_id FROM wallets WHERE id = NEW.wallet_id;

  INSERT INTO notifications (user_id, title, message, reference_id)
  VALUES (
    v_user_id,
    'Depósito confirmado! ✅',
    'Seu depósito de R$ ' || TRIM(TO_CHAR(NEW.amount, 'FM999G999D00')) || ' foi creditado na sua carteira.',
    NEW.id
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_user_on_deposit
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_deposit();
