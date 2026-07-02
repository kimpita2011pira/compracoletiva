GRANT USAGE ON SCHEMA _private TO service_role;
GRANT EXECUTE ON FUNCTION _private.get_webhook_secret(text) TO service_role;
-- Expose via a public RPC (service_role only) so PostgREST can reach it
CREATE OR REPLACE FUNCTION public.get_internal_webhook_secret()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, _private
AS $$
  SELECT _private.get_webhook_secret('internal')
$$;
REVOKE EXECUTE ON FUNCTION public.get_internal_webhook_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_webhook_secret() TO service_role;
