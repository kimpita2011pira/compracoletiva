
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS source_suggestion_id uuid REFERENCES public.offer_suggestions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_source_suggestion ON public.offers(source_suggestion_id);

CREATE OR REPLACE FUNCTION public.notify_suggestion_became_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion public.offer_suggestions%ROWTYPE;
  v_vendor_name text;
  v_should_notify boolean := false;
  v_user record;
BEGIN
  -- Only when offer is active and linked to a suggestion
  IF NEW.source_suggestion_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'ATIVA' THEN
    v_should_notify := true;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.status = 'ATIVA'
    AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.source_suggestion_id IS DISTINCT FROM NEW.source_suggestion_id) THEN
    v_should_notify := true;
  END IF;

  IF NOT v_should_notify THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_suggestion FROM public.offer_suggestions WHERE id = NEW.source_suggestion_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT company_name INTO v_vendor_name FROM public.vendors WHERE id = NEW.vendor_id;

  -- Notify author + voters (dedup)
  FOR v_user IN
    SELECT DISTINCT uid FROM (
      SELECT v_suggestion.user_id AS uid
      UNION
      SELECT user_id AS uid FROM public.offer_suggestion_votes WHERE suggestion_id = v_suggestion.id
    ) t
    WHERE uid IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, message, reference_id)
    VALUES (
      v_user.uid,
      'Sua sugestão virou oferta! 🎉',
      'A sugestão "' || v_suggestion.title || '" foi aprovada e agora está ativa como oferta de ' || COALESCE(v_vendor_name, 'um vendedor') || ': "' || NEW.title || '".',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_suggestion_became_offer_ins ON public.offers;
CREATE TRIGGER trg_notify_suggestion_became_offer_ins
AFTER INSERT ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.notify_suggestion_became_offer();

DROP TRIGGER IF EXISTS trg_notify_suggestion_became_offer_upd ON public.offers;
CREATE TRIGGER trg_notify_suggestion_became_offer_upd
AFTER UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.notify_suggestion_became_offer();
