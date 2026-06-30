-- ============================================================
-- 001_extensions.sql
-- Enable required PostgreSQL extensions
-- ============================================================

-- UUID generation (uuid_generate_v4())
create extension if not exists "uuid-ossp";

-- pg_cron for scheduled cleanup jobs (enable in Supabase dashboard: Database → Extensions)
-- create extension if not exists "pg_cron";

-- moddatetime for automatic updated_at timestamps
create extension if not exists "moddatetime" schema extensions;
