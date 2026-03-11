
-- Add pix_key to vendors table
ALTER TABLE public.vendors ADD COLUMN pix_key text;

-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  pix_key text NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own requests
CREATE POLICY "Vendors view own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Vendors can insert their own requests
CREATE POLICY "Vendors insert own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins manage all
CREATE POLICY "Admins manage withdrawals" ON public.withdrawal_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- Trigger to notify admins on new withdrawal request
CREATE OR REPLACE FUNCTION public.notify_admins_on_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin RECORD;
  v_vendor_name text;
BEGIN
  SELECT company_name INTO v_vendor_name FROM vendors WHERE id = NEW.vendor_id;
  
  FOR v_admin IN SELECT user_id FROM user_roles WHERE role = 'ADMIN'
  LOOP
    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (
      v_admin.user_id,
      'Solicitação de saque 💸',
      'O vendedor "' || COALESCE(v_vendor_name, 'desconhecido') || '" solicitou saque de R$ ' || TRIM(TO_CHAR(NEW.amount, 'FM999G999D00')) || ' via Pix.',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_withdrawal
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_withdrawal();
