DO $$
BEGIN
    PERFORM public.fix_vendor_offer_credits('85f39c39-c4a7-47f8-bbe4-724cda04ed3a');
    PERFORM public.fix_vendor_offer_credits('b6af7a93-5f38-4379-beaa-0cc6aad0a086');
END $$;