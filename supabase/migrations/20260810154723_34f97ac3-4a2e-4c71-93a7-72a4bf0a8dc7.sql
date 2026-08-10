
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
  -- Somente dispara quando o status realmente muda
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Somente notifica para VALIDADA ou CANCELADA
  IF NEW.status NOT IN ('VALIDADA', 'CANCELADA') THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'VALIDADA' THEN
      v_title := 'Oferta validada! ✅';
      v_message := 'A oferta "' || NEW.title || '" que você reservou atingiu a meta e foi validada. Seu pedido será confirmado em breve.';
    WHEN 'CANCELADA' THEN
      v_title := 'Oferta não atingiu a meta ❌';
      v_message := 'A oferta "' || NEW.title || '" foi encerrada sem atingir o número mínimo de pedidos. O valor reservado foi devolvido integralmente para sua carteira.';
  END CASE;

  -- Notifica cada cliente que tem um pedido RESERVADO para esta oferta
  -- Nota: O status do pedido já deve ter sido alterado para ESTORNADO ou CONFIRMADO na função validate_expired_offers
  -- Mas o trigger dispara baseado no status da OFERTA.
  FOR v_order IN
    SELECT DISTINCT user_id
    FROM orders
    WHERE offer_id = NEW.id
      AND status IN ('RESERVADO', 'ESTORNADO', 'CONFIRMADO')
      AND updated_at >= (now() - interval '1 minute') -- Evita notificar pedidos antigos
  LOOP
    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (v_order.user_id, v_title, v_message, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Limpeza da função temporária agora que os estornos foram processados
DROP FUNCTION IF EXISTS public.process_manual_refunds();
