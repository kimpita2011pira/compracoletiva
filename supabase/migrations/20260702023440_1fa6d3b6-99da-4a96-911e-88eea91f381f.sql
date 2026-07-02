
-- ============ Private schema for internal webhook secret ============
CREATE SCHEMA IF NOT EXISTS _private;
REVOKE ALL ON SCHEMA _private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS _private.webhook_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON _private.webhook_secrets FROM PUBLIC, anon, authenticated;

INSERT INTO _private.webhook_secrets(key, value)
VALUES ('internal', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION _private.get_webhook_secret(p_key text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = _private
AS $$
  SELECT value FROM _private.webhook_secrets WHERE key = p_key
$$;
REVOKE EXECUTE ON FUNCTION _private.get_webhook_secret(text) FROM PUBLIC, anon, authenticated;

-- ============ 1. credit_wallet: revoke public access ============
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, uuid) FROM PUBLIC, anon, authenticated;

-- ============ 2. handle_new_user_role: whitelist safe roles only ============
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested text;
  v_role app_role;
BEGIN
  v_requested := NEW.raw_user_meta_data->>'role';
  v_role := CASE
    WHEN v_requested = 'VENDEDOR' THEN 'VENDEDOR'::app_role
    ELSE 'CLIENTE'::app_role
  END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

-- ============ 3. notify_interested_users: enforce vendor ownership ============
CREATE OR REPLACE FUNCTION public.notify_interested_users(p_source_offer_id uuid, p_new_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interest RECORD;
  v_new_offer_title text;
  v_vendor_name text;
  v_vendor_user_id uuid;
BEGIN
  SELECT o.title, v.company_name, v.user_id
    INTO v_new_offer_title, v_vendor_name, v_vendor_user_id
  FROM offers o JOIN vendors v ON v.id = o.vendor_id
  WHERE o.id = p_new_offer_id;

  IF v_new_offer_title IS NULL THEN RETURN; END IF;
  IF v_vendor_user_id IS NULL OR v_vendor_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR v_interest IN
    SELECT DISTINCT user_id FROM offer_interests WHERE offer_id = p_source_offer_id
  LOOP
    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (v_interest.user_id,
      'Oferta recriada! 🔄',
      'A oferta "' || v_new_offer_title || '" de ' || COALESCE(v_vendor_name, 'um vendedor') || ' foi recriada. Aproveite!',
      p_new_offer_id);
  END LOOP;
END;
$$;

-- ============ 4. Drop overly-broad policies ============
DROP POLICY IF EXISTS "Anyone can view interests" ON public.offer_interests;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- ============ 5. Add WITH CHECK on missing policies ============
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own orders" ON public.orders;
CREATE POLICY "Users manage own orders" ON public.orders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own review" ON public.reviews;
CREATE POLICY "Users can update own review" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ 6. city_licenses: explicit lock-down (defense-in-depth) ============
-- Ensure no unintended SELECT to non-admins; existing ALL admin policy remains.
-- (No changes needed; leaving explicit note by re-asserting RLS.)
ALTER TABLE public.city_licenses ENABLE ROW LEVEL SECURITY;

-- ============ 7. Storage: drop broad listing policies (public buckets still serve via CDN) ============
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view offer images" ON storage.objects;

-- ============ 8. Revoke EXECUTE from SECURITY DEFINER helpers that shouldn't be client-callable ============
REVOKE EXECUTE ON FUNCTION public.notify_zapier_new_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_zapier_new_offer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_zapier_new_vendor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_zapier_offer_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_zapier_offer_min_reached() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_zapier_vendor_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_whatsapp_on_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_vendor_on_offer_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_customers_on_offer_validation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_customer_on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_vendor_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_vendor_on_min_reached() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_on_deposit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_vendor_edit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_withdrawal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_expired_offers() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- Keep client-callable definers explicit:
GRANT EXECUTE ON FUNCTION public.reserve_offer(uuid, integer, delivery_type, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_franchisee_cities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_franchisee_for_city(uuid, character varying, character varying) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_interested_users(uuid, uuid) TO authenticated;

-- ============ 9. Update Zapier + WhatsApp triggers to include internal secret header ============
CREATE OR REPLACE FUNCTION public.send_whatsapp_on_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text;
BEGIN
  v_secret := _private.get_webhook_secret('internal');
  PERFORM net.http_post(
    url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/send-whatsapp',
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id, 'user_id', NEW.user_id, 'title', NEW.title,
      'message', NEW.message, 'reference_id', NEW.reference_id, 'created_at', NEW.created_at)),
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_zapier_new_vendor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text;
BEGIN
  v_secret := _private.get_webhook_secret('internal');
  PERFORM net.http_post(
    url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor',
    body := jsonb_build_object('event','new_vendor_registration','record', jsonb_build_object(
      'id', NEW.id,'company_name', NEW.company_name,'cnpj', NEW.cnpj,'city', NEW.city,
      'description', NEW.description,'status', NEW.status,'created_at', NEW.created_at)),
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_zapier_vendor_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('APROVADO','REJEITADO') THEN RETURN NEW; END IF;
  v_secret := _private.get_webhook_secret('internal');
  PERFORM net.http_post(
    url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor',
    body := jsonb_build_object('event','vendor_status_change','record', jsonb_build_object(
      'id', NEW.id,'company_name', NEW.company_name,'cnpj', NEW.cnpj,'city', NEW.city,
      'description', NEW.description,'status', NEW.status,'created_at', NEW.created_at),
      'old_record', jsonb_build_object('status', OLD.status)),
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_zapier_new_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text; v_vendor_name text;
BEGIN
  SELECT company_name INTO v_vendor_name FROM public.vendors WHERE id = NEW.vendor_id;
  v_secret := _private.get_webhook_secret('internal');
  PERFORM net.http_post(
    url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor',
    body := jsonb_build_object('event','new_offer_published','record', jsonb_build_object(
      'id', NEW.id,'title', NEW.title,'offer_price', NEW.offer_price,
      'vendor_id', NEW.vendor_id,'created_at', NEW.created_at),
      'vendor_name', v_vendor_name),
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_zapier_offer_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text; v_vendor_name text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  SELECT company_name INTO v_vendor_name FROM public.vendors WHERE id = NEW.vendor_id;
  v_secret := _private.get_webhook_secret('internal');
  PERFORM net.http_post(
    url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor',
    body := jsonb_build_object('event','offer_status_change','record', jsonb_build_object(
      'id', NEW.id,'title', NEW.title,'status', NEW.status,
      'vendor_id', NEW.vendor_id,'created_at', NEW.created_at),
      'old_record', jsonb_build_object('status', OLD.status),
      'vendor_name', v_vendor_name),
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_zapier_offer_min_reached()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text; v_vendor_name text;
BEGIN
  IF OLD.sold_quantity < OLD.min_quantity AND NEW.sold_quantity >= NEW.min_quantity THEN
    SELECT company_name INTO v_vendor_name FROM public.vendors WHERE id = NEW.vendor_id;
    v_secret := _private.get_webhook_secret('internal');
    PERFORM net.http_post(
      url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor',
      body := jsonb_build_object('event','offer_min_reached','record', jsonb_build_object(
        'id', NEW.id,'title', NEW.title,'sold_quantity', NEW.sold_quantity,
        'min_quantity', NEW.min_quantity,'vendor_id', NEW.vendor_id,'created_at', NEW.created_at),
        'vendor_name', v_vendor_name),
      headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_zapier_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_secret text; v_buyer_name text; v_offer_title text; v_vendor_name text;
BEGIN
  SELECT name INTO v_buyer_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT o.title, v.company_name INTO v_offer_title, v_vendor_name
    FROM public.offers o JOIN public.vendors v ON v.id = o.vendor_id WHERE o.id = NEW.offer_id;
  v_secret := _private.get_webhook_secret('internal');
  PERFORM net.http_post(
    url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor',
    body := jsonb_build_object('event','new_order_reservation','record', jsonb_build_object(
      'id', NEW.id,'offer_id', NEW.offer_id,'quantity', NEW.quantity,
      'unit_price', NEW.unit_price,'total_price', NEW.total_price,
      'delivery_type', NEW.delivery_type,'created_at', NEW.created_at),
      'buyer_name', v_buyer_name,'offer_title', v_offer_title,'vendor_name', v_vendor_name),
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', v_secret)
  );
  RETURN NEW;
END; $$;
