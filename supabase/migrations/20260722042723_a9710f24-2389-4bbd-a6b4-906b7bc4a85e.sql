-- Add admin_id column to audit_logs if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'admin_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN admin_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Update the admin_approve_vendor function to include audit logging
CREATE OR REPLACE FUNCTION public.admin_approve_vendor(v_vendor_id uuid, v_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
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
$$;
