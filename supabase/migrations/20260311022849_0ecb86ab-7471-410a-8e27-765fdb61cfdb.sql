
CREATE OR REPLACE FUNCTION public.notify_admins_on_vendor_edit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_admin RECORD;
  v_company text;
BEGIN
  -- Only fire when status changes TO PENDENTE and previous_data is set (edit scenario)
  IF NEW.status = 'PENDENTE' AND NEW.previous_data IS NOT NULL AND (OLD.previous_data IS DISTINCT FROM NEW.previous_data) THEN
    v_company := NEW.company_name;

    FOR v_admin IN
      SELECT user_id FROM user_roles WHERE role = 'ADMIN'
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
$$;

CREATE TRIGGER trg_notify_admins_on_vendor_edit
  AFTER UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_vendor_edit();
