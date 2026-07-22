CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requested text;
  v_role app_role;
  v_email text;
BEGIN
  v_requested := NEW.raw_user_meta_data->>'role';
  v_email := NEW.email;

  -- Logic to automatically assign ADMIN role to specific email
  IF v_email = 'compracoletivapira@gmail.com' THEN
    v_role := 'ADMIN'::app_role;
  ELSE
    v_role := CASE
      WHEN v_requested = 'VENDEDOR' THEN 'VENDEDOR'::app_role
      ELSE 'CLIENTE'::app_role
    END;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Update existing user if they already exist
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'compracoletivapira@gmail.com';
    IF v_user_id IS NOT NULL THEN
        -- Add admin role if not present
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'ADMIN'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Optionally remove other roles if needed, but usually ADMIN is additive or exclusive
        -- For this system, we want them to have the ADMIN role.
    END IF;
END $$;
