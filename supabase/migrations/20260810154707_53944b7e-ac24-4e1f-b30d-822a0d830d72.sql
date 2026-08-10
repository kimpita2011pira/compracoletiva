
DO $$
BEGIN
    PERFORM public.process_manual_refunds();
END $$;
