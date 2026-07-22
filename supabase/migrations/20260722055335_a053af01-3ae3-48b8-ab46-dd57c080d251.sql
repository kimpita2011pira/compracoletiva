-- Rename columns to match existing application code
ALTER TABLE public.audit_logs RENAME COLUMN entity_type TO table_name;
ALTER TABLE public.audit_logs RENAME COLUMN entity_id TO record_id;

-- Update the admin_approve_vendor function to use correct columns
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
