ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'PAUSADA';

CREATE OR REPLACE FUNCTION public.pause_vendor_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_vendor_id uuid; v_status text;
BEGIN
  SELECT vendor_id, status::text INTO v_vendor_id, v_status FROM public.offers WHERE id = p_offer_id;
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = v_vendor_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF v_status <> 'ATIVA' THEN RAISE EXCEPTION 'Somente ofertas ativas podem ser pausadas'; END IF;

  UPDATE public.offers SET status = 'PAUSADA'::public.offer_status, updated_at = now() WHERE id = p_offer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_vendor_offer(p_offer_id uuid, p_new_end_date timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_vendor_id uuid; v_status text;
BEGIN
  SELECT vendor_id, status::text INTO v_vendor_id, v_status FROM public.offers WHERE id = p_offer_id;
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'Oferta não encontrada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = v_vendor_id AND user_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF v_status <> 'PAUSADA' THEN RAISE EXCEPTION 'Somente ofertas pausadas podem ser retomadas'; END IF;
  IF p_new_end_date IS NULL OR p_new_end_date <= now() THEN
    RAISE EXCEPTION 'A nova data de encerramento deve ser no futuro';
  END IF;

  UPDATE public.offers
  SET status = 'ATIVA'::public.offer_status, end_date = p_new_end_date, updated_at = now()
  WHERE id = p_offer_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pause_vendor_offer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resume_vendor_offer(uuid, timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.pause_vendor_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_vendor_offer(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_wallets()
RETURNS TABLE(
  wallet_id uuid,
  user_id uuid,
  name text,
  balance numeric,
  updated_at timestamptz,
  roles text,
  company_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.user_id, p.name::text, w.balance, w.updated_at,
         (SELECT string_agg(ur.role::text, ', ' ORDER BY ur.role::text)
            FROM public.user_roles ur WHERE ur.user_id = w.user_id) AS roles,
         (SELECT v.company_name::text FROM public.vendors v WHERE v.user_id = w.user_id LIMIT 1) AS company_name
  FROM public.wallets w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE public.has_role(auth.uid(), 'ADMIN'::public.app_role)
  ORDER BY w.balance DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_wallets() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_wallets() TO authenticated;

-- Notifica vendedor e admins quando uma oferta finalizada gera crédito
CREATE OR REPLACE FUNCTION public.notify_offer_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_title text;
  v_wallet_owner uuid;
  v_vendor_name text;
  v_admin record;
  v_amount text;
BEGIN
  IF NEW.type <> 'CREDITO'::public.transaction_type OR NEW.reference_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT o.title, v.company_name INTO v_offer_title, v_vendor_name
  FROM public.offers o JOIN public.vendors v ON v.id = o.vendor_id
  WHERE o.id = NEW.reference_id;

  IF v_offer_title IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_wallet_owner FROM public.wallets WHERE id = NEW.wallet_id;
  v_amount := TRIM(TO_CHAR(NEW.amount, 'FM999G999D00'));

  IF v_wallet_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, reference_id)
    VALUES (v_wallet_owner,
      'Valor creditado na carteira 💰',
      'A oferta "' || v_offer_title || '" foi finalizada e R$ ' || v_amount || ' já está disponível na sua carteira.',
      NEW.reference_id);
  END IF;

  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'ADMIN'::public.app_role LOOP
    IF v_admin.user_id IS DISTINCT FROM v_wallet_owner THEN
      INSERT INTO public.notifications (user_id, title, message, reference_id)
      VALUES (v_admin.user_id,
        'Oferta finalizada 📊',
        'A oferta "' || v_offer_title || '" de ' || COALESCE(v_vendor_name, 'um vendedor') ||
        ' foi finalizada. Crédito de R$ ' || v_amount || ' liberado.',
        NEW.reference_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offer_credit ON public.wallet_transactions;
CREATE TRIGGER trg_notify_offer_credit
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_offer_credit();