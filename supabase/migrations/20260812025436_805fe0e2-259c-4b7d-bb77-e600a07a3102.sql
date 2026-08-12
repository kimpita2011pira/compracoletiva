-- Fix missing updated_at column in offers table and update reactivate function
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'offers' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.offers ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
        
        -- Add the update trigger for the new column
        -- We assume public.update_updated_at() already exists as seen in earlier logs
        CREATE TRIGGER update_offers_updated_at 
        BEFORE UPDATE ON public.offers 
        FOR EACH ROW 
        EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;

-- Update the reactivate function to be more robust
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
      updated_at = now()
  WHERE id = p_offer_id;
END;
$function$;
