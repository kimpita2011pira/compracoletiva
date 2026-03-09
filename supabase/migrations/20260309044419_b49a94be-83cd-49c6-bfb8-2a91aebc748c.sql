-- Add state and city columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN state character varying(2),
ADD COLUMN city character varying(100);

-- Update handle_new_user to also save state and city
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, phone, whatsapp, state, city) 
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'city'
  );
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;