
CREATE OR REPLACE FUNCTION public.notify_vendor_on_min_reached()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_vendor_user_id uuid;
BEGIN
  -- Only fire when sold_quantity crosses min_quantity threshold
  IF OLD.sold_quantity < OLD.min_quantity AND NEW.sold_quantity >= NEW.min_quantity THEN
    SELECT user_id INTO v_vendor_user_id FROM vendors WHERE id = NEW.vendor_id;

    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (
      v_vendor_user_id,
      'Meta atingida! 🎉',
      'Sua oferta "' || NEW.title || '" atingiu a meta mínima de ' || NEW.min_quantity || ' reservas. A oferta será validada ao encerrar.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_vendor_on_min_reached
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_on_min_reached();
