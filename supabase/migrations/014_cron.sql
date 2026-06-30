-- ============================================================
-- 014_cron.sql
-- Scheduled maintenance jobs via pg_cron
--
-- PREREQUISITE: Enable the pg_cron extension first in the
-- Supabase dashboard → Database → Extensions → pg_cron
-- Then uncomment and run the statements below.
-- ============================================================

-- Uncomment after enabling pg_cron:

-- select cron.schedule(
--   'cleanup-stalled-jobs',       -- job name (must be unique)
--   '*/15 * * * *',               -- every 15 minutes
--   $$ select public.cleanup_stalled_jobs(); $$
-- );

-- select cron.schedule(
--   'cleanup-expired-exports',
--   '0 3 * * *',                  -- daily at 03:00 UTC
--   $$ select public.cleanup_expired_exports(); $$
-- );

-- ── Manual check queries (run in SQL editor as needed) ────────────────────

-- View all scheduled cron jobs:
-- select * from cron.job;

-- View cron job run history:
-- select * from cron.job_run_details order by start_time desc limit 50;

-- Unschedule a job:
-- select cron.unschedule('cleanup-stalled-jobs');
