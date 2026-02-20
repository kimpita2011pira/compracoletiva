
-- Function: notify all customers with RESERVADO orders when an offer is auto-validated or auto-cancelled
CREATE OR REPLACE FUNCTION public.notify_customers_on_offer_validation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_title text;
  v_message text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify for VALIDADA or CANCELADA
  IF NEW.status NOT IN ('VALIDADA', 'CANCELADA') THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'VALIDADA' THEN
      v_title := 'Oferta validada! ✅';
      v_message := 'A oferta "' || NEW.title || '" que você reservou atingiu a meta e foi validada. Seu pedido será confirmado em breve.';
    WHEN 'CANCELADA' THEN
      v_title := 'Oferta cancelada ❌';
      v_message := 'A oferta "' || NEW.title || '" não atingiu a meta mínima de ' || NEW.min_quantity || ' reservas e foi cancelada. O valor da sua reserva será estornado à sua carteira.';
  END CASE;

  -- Notify each customer who has a RESERVADO order for this offer
  FOR v_order IN
    SELECT DISTINCT user_id
    FROM orders
    WHERE offer_id = NEW.id
      AND status = 'RESERVADO'
  LOOP
    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (v_order.user_id, v_title, v_message, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Trigger on offers table
CREATE TRIGGER notify_customers_on_offer_validation_trigger
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customers_on_offer_validation();
