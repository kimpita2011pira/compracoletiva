
CREATE OR REPLACE FUNCTION public.notify_interested_users(p_source_offer_id uuid, p_new_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_interest RECORD;
  v_new_offer_title text;
  v_vendor_name text;
BEGIN
  -- Get new offer title and vendor name
  SELECT o.title, v.company_name INTO v_new_offer_title, v_vendor_name
  FROM offers o
  JOIN vendors v ON v.id = o.vendor_id
  WHERE o.id = p_new_offer_id;

  IF v_new_offer_title IS NULL THEN
    RETURN;
  END IF;

  -- Notify each interested user
  FOR v_interest IN
    SELECT DISTINCT user_id FROM offer_interests WHERE offer_id = p_source_offer_id
  LOOP
    INSERT INTO notifications (user_id, title, message, reference_id)
    VALUES (
      v_interest.user_id,
      'Oferta recriada! 🔄',
      'A oferta "' || v_new_offer_title || '" de ' || COALESCE(v_vendor_name, 'um vendedor') || ' foi recriada. Aproveite!',
      p_new_offer_id
    );
  END LOOP;
END;
$$;
