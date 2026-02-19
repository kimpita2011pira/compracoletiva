
CREATE OR REPLACE FUNCTION public.notify_customer_on_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_offer_title text;
  v_status_label text;
  v_message text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify for these statuses
  IF NEW.status NOT IN ('CONFIRMADO', 'CANCELADO', 'ESTORNADO') THEN
    RETURN NEW;
  END IF;

  -- Get offer title
  SELECT title INTO v_offer_title FROM offers WHERE id = NEW.offer_id;

  -- Build message per status
  CASE NEW.status
    WHEN 'CONFIRMADO' THEN
      v_status_label := 'Pedido confirmado! ✅';
      v_message := 'Seu pedido de "' || COALESCE(v_offer_title, 'oferta') || '" (R$ ' || TRIM(TO_CHAR(NEW.total_price, 'FM999G999D00')) || ') foi confirmado pelo vendedor.';
    WHEN 'CANCELADO' THEN
      v_status_label := 'Pedido cancelado ❌';
      v_message := 'Seu pedido de "' || COALESCE(v_offer_title, 'oferta') || '" foi cancelado.';
    WHEN 'ESTORNADO' THEN
      v_status_label := 'Pedido estornado 💸';
      v_message := 'Seu pedido de "' || COALESCE(v_offer_title, 'oferta') || '" foi estornado. O valor de R$ ' || TRIM(TO_CHAR(NEW.total_price, 'FM999G999D00')) || ' será devolvido à sua carteira.';
  END CASE;

  INSERT INTO notifications (user_id, title, message, reference_id)
  VALUES (NEW.user_id, v_status_label, v_message, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_customer_on_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_on_order_status_change();
