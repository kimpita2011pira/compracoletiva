-- Add default_address_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_address_id UUID REFERENCES public.addresses(id);

-- Add delivery_address_details to orders to store snapshot of address if needed
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address_details JSONB;

GRANT UPDATE(default_address_id) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
