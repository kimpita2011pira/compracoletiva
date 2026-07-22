CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- 1. Remover registros de tabelas dependentes (ou anonimizar)
  -- Nota: user_roles tem ON DELETE CASCADE na maioria das vezes, mas garantimos aqui
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- 2. Limpar dados sensíveis do perfil antes de deletar (ou se quiser manter estatísticas)
  -- Aqui vamos deletar o perfil, o que deve disparar remoções em cascata se configurado
  DELETE FROM public.profiles WHERE id = v_user_id;
  
  -- 3. Deletar endereços
  DELETE FROM public.addresses WHERE user_id = v_user_id;

  -- 4. Nota sobre auth.users: 
  -- No Supabase, SECURITY DEFINER functions rodando no schema public não podem 
  -- deletar diretamente de auth.users por padrão sem extensões extras.
  -- No entanto, remover o perfil e roles já bloqueia o acesso efetivo do usuário 
  -- às funcionalidades da plataforma enquanto o registro auth permanece inativo
  -- ou pode ser removido via processo administrativo/Edge Function.
  
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
