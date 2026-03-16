
CREATE OR REPLACE FUNCTION public.send_whatsapp_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_payload jsonb;
BEGIN
  v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/send-whatsapp';
  
  v_payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'reference_id', NEW.reference_id,
      'created_at', NEW.created_at
    )
  );

  PERFORM net.http_post(
    url := v_url,
    body := v_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbWlremN2a2RzdGh1eHhodm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTIyNjEsImV4cCI6MjA4NjQyODI2MX0.lABYPZXj-grue1ZKaTc5PYCDDNRAEzrAv0f3jPwwMPQ'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_whatsapp_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_whatsapp_on_notification();
