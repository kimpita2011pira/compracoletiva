-- Final audit and hardening of app_role comparisons in PostgreSQL functions
-- This migration ensures consistency across all critical admin functions

-- 1. Hardening admin_approve_vendor (Final Version)
CREATE OR REPLACE FUNCTION public.admin_approve_vendor(v_vendor_id uuid, v_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only admins can call this (ensuring uppercase 'ADMIN')
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'ADMIN'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.vendors
  SET status = v_status::vendor_status,
      previous_data = NULL
  WHERE id = v_vendor_id;

  INSERT INTO public.audit_logs (action, table_name, record_id, details, admin_id)
  VALUES (
    'UPDATE_VENDOR_STATUS',
    'vendors',
    v_vendor_id,
    jsonb_build_object('new_status', v_status),
    auth.uid()
  );
END;
$function$;

-- 2. Hardening notify_admins_on_vendor_edit (Final Version)
CREATE OR REPLACE FUNCTION public.notify_admins_on_vendor_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin RECORD;
  v_company text;
BEGIN
  -- Only fire when status changes TO PENDENTE and previous_data is set
  IF NEW.status = 'PENDENTE' AND NEW.previous_data IS NOT NULL AND (OLD.previous_data IS DISTINCT FROM NEW.previous_data) THEN
    v_company := NEW.company_name;

    FOR v_admin IN 
      SELECT user_id FROM user_roles WHERE role = 'ADMIN'::public.app_role
    LOOP
      INSERT INTO notifications (user_id, title, message, reference_id)
      VALUES (
        v_admin.user_id,
        'Vendedor editou cadastro ✏️',
        'O vendedor "' || v_company || '" alterou seus dados e aguarda nova aprovação.',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Hardening notify_admins_on_withdrawal (Final Version)
CREATE OR REPLACE FUNCTION public.notify_admins_on_withdrawal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin RECORD;
  v_vendor_name text;
BEGIN
  SELECT company_name INTO v_vendor_name FROM vendors WHERE id = NEW.vendor_id;

  FOR v_admin IN SELECT user_id FROM user_roles WHERE role = 'ADMIN'::public.app_role
  LOOP
    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (
      v_admin.user_id,
      'Solicitação de saque 💸',
      'O vendedor "' || COALESCE(v_vendor_name, 'desconhecido') || '" solicitou saque de R$ ' || TRIM(TO_CHAR(NEW.amount, 'FM999G999D00')) || ' via Pix.',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

-- 4. Ensuring handle_new_user_role also respects the uppercase standard
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  -- Auto-assign ADMIN to the specific enterprise email
  IF NEW.email = 'compracoletivapira@gmail.com' THEN
    v_role := 'ADMIN'::public.app_role;
  ELSE
    -- Default role from metadata or 'CLIENTE'
    BEGIN
      v_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'CLIENTE'::public.app_role;
    END;
  END IF;

  -- Whitelist roles to prevent escalation from metadata
  IF v_role IS NULL OR v_role NOT IN ('CLIENTE'::public.app_role, 'VENDEDOR'::public.app_role, 'ADMIN'::public.app_role, 'FRANQUEADO'::public.app_role) THEN
    v_role := 'CLIENTE'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;
