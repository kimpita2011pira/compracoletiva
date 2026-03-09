-- Create trigger function for offer reaching min quantity
CREATE OR REPLACE FUNCTION public.notify_zapier_offer_min_reached()
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
  -- Only fire when sold_quantity crosses min_quantity threshold
  IF OLD.sold_quantity < OLD.min_quantity AND NEW.sold_quantity >= NEW.min_quantity THEN
    SELECT company_name INTO v_vendor_name FROM public.vendors WHERE id = NEW.vendor_id;

    v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor';
    
    v_payload := jsonb_build_object(
      'event', 'offer_min_reached',
      'record', jsonb_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'sold_quantity', NEW.sold_quantity,
        'min_quantity', NEW.min_quantity,
        'vendor_id', NEW.vendor_id,
        'created_at', NEW.created_at
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_zapier_offer_min_reached ON public.offers;
CREATE TRIGGER trigger_notify_zapier_offer_min_reached
  AFTER UPDATE OF sold_quantity ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_zapier_offer_min_reached();