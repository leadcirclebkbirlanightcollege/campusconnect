-- Reinstall pg_cron and pg_net in extensions schema to satisfy linter 0014
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop first (no cron jobs configured yet)
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

-- Recreate in dedicated schema
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;