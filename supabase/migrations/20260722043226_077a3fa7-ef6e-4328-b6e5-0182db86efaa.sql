-- 1. Atualizar a função handle_new_user_role para NÃO conceder ADMIN ao e-mail antigo
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

  -- Apenas compracoletivapira@gmail.com é admin automático
  IF v_email = 'compracoletivapira@gmail.com' THEN
    v_role := 'ADMIN'::app_role;
  ELSE
    -- Se for o e-mail antigo ou qualquer outro, segue o fluxo normal
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

-- 2. Remover explicitamente a role ADMIN do usuário kimpita2011@gmail.com
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'kimpita2011@gmail.com';
    IF v_user_id IS NOT NULL THEN
        -- Remove apenas a role de ADMIN
        DELETE FROM public.user_roles 
        WHERE user_id = v_user_id 
        AND role = 'ADMIN'::app_role;
        
        -- Garante que ele tenha a role de VENDEDOR (como solicitado)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'VENDEDOR'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;