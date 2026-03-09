-- Create trigger function for offer status change
CREATE OR REPLACE FUNCTION public.notify_zapier_offer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_payload jsonb;
  v_vendor_name text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the vendor name
  SELECT company_name INTO v_vendor_name
  FROM public.vendors
  WHERE id = NEW.vendor_id;

  v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor';
  
  v_payload := jsonb_build_object(
    'event', 'offer_status_change',
    'record', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'status', NEW.status,
      'vendor_id', NEW.vendor_id,
      'created_at', NEW.created_at
    ),
    'old_record', jsonb_build_object(
      'status', OLD.status
    ),
    'vendor_name', v_vendor_name
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

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_zapier_offer_status_change ON public.offers;
CREATE TRIGGER trigger_notify_zapier_offer_status_change
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_zapier_offer_status_change();