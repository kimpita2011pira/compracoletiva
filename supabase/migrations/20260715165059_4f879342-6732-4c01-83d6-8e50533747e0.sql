
-- 1) Enum value for wallet transactions
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'TAXA_ADMIN';

-- 2) Platform settings (single row)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  monthly_admin_fee numeric NOT NULL DEFAULT 0 CHECK (monthly_admin_fee >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = true)
);

GRANT SELECT ON public.platform_settings TO authenticated, anon;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert settings" ON public.platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Only admins can update settings" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

INSERT INTO public.platform_settings (id, monthly_admin_fee)
VALUES (true, 0) ON CONFLICT (id) DO NOTHING;

-- 3) Charges tracking table
CREATE TABLE IF NOT EXISTS public.user_admin_fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  amount numeric NOT NULL,
  charged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

GRANT SELECT ON public.user_admin_fee_charges TO authenticated;
GRANT ALL ON public.user_admin_fee_charges TO service_role;

ALTER TABLE public.user_admin_fee_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own charges" ON public.user_admin_fee_charges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all charges" ON public.user_admin_fee_charges
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- 4) Charge function (idempotent per current month; buyers only)
CREATE OR REPLACE FUNCTION public.charge_admin_fee_current_month(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee numeric;
  v_month date := date_trunc('month', now())::date;
  v_wallet public.wallets%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Skip non-buyers (vendors, admins, franchisees)
  IF public.has_role(_user_id, 'VENDEDOR')
     OR public.has_role(_user_id, 'ADMIN')
     OR public.has_role(_user_id, 'FRANQUEADO') THEN
    RETURN false;
  END IF;

  SELECT monthly_admin_fee INTO v_fee FROM public.platform_settings WHERE id = true;
  IF v_fee IS NULL OR v_fee <= 0 THEN RETURN false; END IF;

  -- Already charged this month?
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

  -- Credit platform wallet
  UPDATE public.platform_wallet
    SET balance = balance + v_fee, updated_at = now()
    WHERE id = (SELECT id FROM public.platform_wallet LIMIT 1);

  RETURN true;
END;
$$;

-- 5) Trigger on deposits to attempt charging pending current-month fee
CREATE OR REPLACE FUNCTION public.try_charge_admin_fee_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.type <> 'DEPOSITO' THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM public.wallets WHERE id = NEW.wallet_id;
  PERFORM public.charge_admin_fee_current_month(v_user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS try_admin_fee_after_deposit ON public.wallet_transactions;
CREATE TRIGGER try_admin_fee_after_deposit
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.try_charge_admin_fee_on_deposit();

-- 6) Monthly job: run current-month charge across all buyer users
CREATE OR REPLACE FUNCTION public.run_monthly_admin_fee()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; v_charged integer := 0;
BEGIN
  FOR r IN
    SELECT ur.user_id FROM public.user_roles ur
    WHERE ur.role = 'CLIENTE'
      AND NOT public.has_role(ur.user_id, 'VENDEDOR')
      AND NOT public.has_role(ur.user_id, 'ADMIN')
      AND NOT public.has_role(ur.user_id, 'FRANQUEADO')
  LOOP
    IF public.charge_admin_fee_current_month(r.user_id) THEN
      v_charged := v_charged + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('charged', v_charged);
END;
$$;

-- Schedule monthly on day 1 at 03:00 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'monthly-admin-fee';
    PERFORM cron.schedule('monthly-admin-fee', '0 3 1 * *', $c$SELECT public.run_monthly_admin_fee();$c$);
  END IF;
END $$;
