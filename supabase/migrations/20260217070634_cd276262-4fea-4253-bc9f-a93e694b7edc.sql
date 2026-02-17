
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;

-- Function to notify vendor on new reservation
CREATE OR REPLACE FUNCTION public.notify_vendor_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vendor_user_id uuid;
  v_offer_title text;
  v_buyer_name text;
BEGIN
  -- Get vendor user_id and offer title
  SELECT v.user_id, o.title INTO v_vendor_user_id, v_offer_title
  FROM offers o JOIN vendors v ON v.id = o.vendor_id
  WHERE o.id = NEW.offer_id;

  -- Get buyer name
  SELECT name INTO v_buyer_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, title, message, reference_id)
  VALUES (
    v_vendor_user_id,
    'Nova reserva!',
    COALESCE(v_buyer_name, 'Um cliente') || ' reservou ' || NEW.quantity || 'x "' || COALESCE(v_offer_title, 'oferta') || '" — R$ ' || NEW.total_price,
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_vendor_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vendor_on_order();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
