-- Function to notify users without a default address (removing type column as it might not exist or have a different name)
CREATE OR REPLACE FUNCTION public.notify_users_missing_address()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    FOR v_user_record IN 
        SELECT p.id, p.name 
        FROM public.profiles p
        WHERE p.default_address_id IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n 
              WHERE n.user_id = p.id 
                AND n.title = 'Complete seu Cadastro'
          )
    LOOP
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (
            v_user_record.id,
            'Complete seu Cadastro',
            'Olá ' || COALESCE(v_user_record.name, 'visitante') || '! Adicione um endereço padrão ao seu perfil para agilizar suas compras com entrega.'
        );
    END LOOP;
END;
$$;

-- Run it once for existing users
SELECT public.notify_users_missing_address();

-- Grant access
GRANT EXECUTE ON FUNCTION public.notify_users_missing_address() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_users_missing_address() TO service_role;
