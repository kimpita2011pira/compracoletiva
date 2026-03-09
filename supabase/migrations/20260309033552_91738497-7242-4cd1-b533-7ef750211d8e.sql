
CREATE OR REPLACE FUNCTION public.notify_zapier_vendor_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_payload jsonb;
BEGIN
  -- Only fire when status actually changes to APROVADO or REJEITADO
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('APROVADO', 'REJEITADO') THEN
    RETURN NEW;
  END IF;

  v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor';
  
  v_payload := jsonb_build_object(
    'event', 'vendor_status_change',
    'record', jsonb_build_object(
      'id', NEW.id,
      'company_name', NEW.company_name,
      'cnpj', NEW.cnpj,
      'city', NEW.city,
      'description', NEW.description,
      'status', NEW.status,
      'created_at', NEW.created_at
    ),
    'old_record', jsonb_build_object(
      'status', OLD.status
    )
  );

  PERFORM extensions.http_post(
    url := v_url,
    body := v_payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbWlremN2a2RzdGh1eHhodm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTIyNjEsImV4cCI6MjA4NjQyODI2MX0.lABYPZXj-grue1ZKaTc5PYCDDNRAEzrAv0f3jPwwMPQ'
    )::jsonb
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_zapier_vendor_status_change
  AFTER UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_zapier_vendor_status_change();
