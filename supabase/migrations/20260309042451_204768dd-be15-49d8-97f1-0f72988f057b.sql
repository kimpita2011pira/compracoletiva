-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
-- Grant usage
GRANT USAGE ON SCHEMA cron TO postgres;