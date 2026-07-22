CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- 1. Remove references and personal data in public schema
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.addresses WHERE user_id = v_user_id;
  DELETE FROM public.wallet_transactions WHERE wallet_id IN (SELECT id FROM public.wallets WHERE user_id = v_user_id);
  DELETE FROM public.wallets WHERE user_id = v_user_id;
  DELETE FROM public.offer_suggestion_votes WHERE user_id = v_user_id;
  DELETE FROM public.offer_suggestions WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  
  -- 2. Delete the profile
  DELETE FROM public.profiles WHERE id = v_user_id;
  
  -- 3. Mark for deletion in auth.users (if service_role was available we'd delete, 
  -- but since we are running as SECURITY DEFINER we can attempt deletion if the schema allows)
  DELETE FROM auth.users WHERE id = v_user_id;
  
END;
$function$;