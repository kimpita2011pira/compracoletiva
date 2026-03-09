-- Create trigger function for new order reservations
CREATE OR REPLACE FUNCTION public.notify_zapier_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_payload jsonb;
  v_buyer_name text;
  v_offer_title text;
  v_vendor_name text;
BEGIN
  -- Get buyer name
  SELECT name INTO v_buyer_name FROM public.profiles WHERE id = NEW.user_id;

  -- Get offer title and vendor name
  SELECT o.title, v.company_name INTO v_offer_title, v_vendor_name
  FROM public.offers o
  JOIN public.vendors v ON v.id = o.vendor_id
  WHERE o.id = NEW.offer_id;

  v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor';
  
  v_payload := jsonb_build_object(
    'event', 'new_order_reservation',
    'record', jsonb_build_object(
      'id', NEW.id,
      'offer_id', NEW.offer_id,
      'quantity', NEW.quantity,
      'unit_price', NEW.unit_price,
      'total_price', NEW.total_price,
      'delivery_type', NEW.delivery_type,
      'created_at', NEW.created_at
    ),
    'buyer_name', v_buyer_name,
    'offer_title', v_offer_title,
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

DROP TRIGGER IF EXISTS trigger_notify_zapier_new_order ON public.orders;
CREATE TRIGGER trigger_notify_zapier_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_zapier_new_order();