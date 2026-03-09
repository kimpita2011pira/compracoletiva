-- Create trigger function for new offers using pg_net
CREATE OR REPLACE FUNCTION public.notify_zapier_new_offer()
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
  -- Get the vendor name
  SELECT company_name INTO v_vendor_name
  FROM public.vendors
  WHERE id = NEW.vendor_id;

  v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor';
  
  v_payload := jsonb_build_object(
    'event', 'new_offer_published',
    'record', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'offer_price', NEW.offer_price,
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

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_zapier_new_offer ON public.offers;
CREATE TRIGGER trigger_notify_zapier_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_zapier_new_offer();