
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_fee_exempt boolean NOT NULL DEFAULT false;

-- Allow admins to update any profile (needed to toggle exemption)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::app_role));

-- Update charge function to respect exemption
CREATE OR REPLACE FUNCTION public.charge_admin_fee_current_month(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fee numeric;
  v_month date := date_trunc('month', now())::date;
  v_wallet public.wallets%ROWTYPE;
  v_exempt boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Skip non-buyers
  IF public.has_role(_user_id, 'VENDEDOR')
     OR public.has_role(_user_id, 'ADMIN')
     OR public.has_role(_user_id, 'FRANQUEADO') THEN
    RETURN false;
  END IF;

  -- Skip exempt users
  SELECT admin_fee_exempt INTO v_exempt FROM public.profiles WHERE id = _user_id;
  IF COALESCE(v_exempt, false) THEN RETURN false; END IF;

  SELECT monthly_admin_fee INTO v_fee FROM public.platform_settings WHERE id = true;
  IF v_fee IS NULL OR v_fee <= 0 THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.user_admin_fee_charges
             WHERE user_id = _user_id AND month = v_month) THEN
    RETURN false;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_fee THEN
    RETURN false;
  END IF;

  UPDATE public.wallets
    SET balance = balance - v_fee, updated_at = now()
    WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description)
  VALUES (v_wallet.id, 'TAXA_ADMIN'::public.transaction_type, v_fee,
          'Taxa administrativa mensal (' || to_char(v_month, 'MM/YYYY') || ')');

  INSERT INTO public.user_admin_fee_charges (user_id, month, amount)
  VALUES (_user_id, v_month, v_fee);

  UPDATE public.platform_wallet
    SET balance = balance + v_fee, updated_at = now()
    WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

  RETURN true;
END;
$function$;
