
CREATE OR REPLACE FUNCTION public.reactivate_vendor_offer(p_offer_id UUID, p_new_end_date TIMESTAMPTZ)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_id UUID;
BEGIN
  -- Verify ownership
  SELECT vendor_id INTO v_vendor_id FROM public.offers WHERE id = p_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oferta não encontrada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = v_vendor_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Ensure new date is in the future
  IF p_new_end_date <= now() THEN
    RAISE EXCEPTION 'A nova data de encerramento deve ser no futuro';
  END IF;

  UPDATE public.offers 
  SET status = 'ATIVA', 
      end_date = p_new_end_date,
      sold_quantity = 0, -- Zera a quantidade vendida para a nova rodada
      updated_at = now()
  WHERE id = p_offer_id;
END;
$function$;
