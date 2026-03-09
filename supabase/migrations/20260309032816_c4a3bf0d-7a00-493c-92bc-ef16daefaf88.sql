
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function that calls the edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_zapier_new_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_payload jsonb;
BEGIN
  v_url := 'https://yimikzcvkdsthuxxhvod.supabase.co/functions/v1/notify-new-vendor';
  
  v_payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'company_name', NEW.company_name,
      'cnpj', NEW.cnpj,
      'city', NEW.city,
      'description', NEW.description,
      'status', NEW.status,
      'created_at', NEW.created_at
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

-- Create trigger on vendors table
CREATE TRIGGER trigger_notify_zapier_new_vendor
  AFTER INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_zapier_new_vendor();
