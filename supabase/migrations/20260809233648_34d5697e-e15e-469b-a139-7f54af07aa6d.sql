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
      v_message := 'Implementar testes de integração para validar que a reserva é feita na carteira do comprador, que o valor é estornado corretamente quando a oferta não é efetivada e que o valor é transferido ao vendedor após a efetivação, incluindo a comissão de 10% para o adm. Adicionar uma tela no AdminDashboard para listar ofertas canceladas e acompanhar o status de cada estorno associado às reservas. Validar o envio da notificação de cancelamento em ambiente de teste garantindo que o texto e os destinatários estejam corretos para cada oferta cancelada.';
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