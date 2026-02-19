
CREATE OR REPLACE FUNCTION public.notify_vendor_on_offer_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_vendor_user_id uuid;
  v_title text;
  v_message text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('VALIDADA', 'CANCELADA', 'ENCERRADA') THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_vendor_user_id FROM vendors WHERE id = NEW.vendor_id;

  CASE NEW.status
    WHEN 'VALIDADA' THEN
      v_title := 'Oferta validada! ✅';
      v_message := 'Sua oferta "' || NEW.title || '" atingiu a meta e foi validada. Os valores serão processados.';
    WHEN 'CANCELADA' THEN
      v_title := 'Oferta cancelada ❌';
      v_message := 'Sua oferta "' || NEW.title || '" não atingiu a meta mínima de ' || NEW.min_quantity || ' reservas e foi cancelada. Os valores serão estornados aos clientes.';
    WHEN 'ENCERRADA' THEN
      v_title := 'Oferta encerrada 🏁';
      v_message := 'Sua oferta "' || NEW.title || '" foi encerrada.';
  END CASE;

  INSERT INTO notifications (user_id, title, message, reference_id)
  VALUES (v_vendor_user_id, v_title, v_message, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_vendor_on_offer_status
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_on_offer_status_change();
