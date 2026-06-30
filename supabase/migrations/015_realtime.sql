-- ============================================================
-- 015_realtime.sql
-- Enable Supabase Realtime on tables the browser subscribes to
-- ============================================================

-- processing_jobs: browser polls status updates
alter publication supabase_realtime add table public.processing_jobs;

-- projects: dashboard reflects status changes
alter publication supabase_realtime add table public.projects;

-- audio_stems: editor shows per-stem progress
alter publication supabase_realtime add table public.audio_stems;

-- scores: reflects when a score becomes available after generation
alter publication supabase_realtime add table public.scores;

-- ── Notes ─────────────────────────────────────────────────────────────────
-- The browser subscribes to a channel filtered by project_id, e.g.:
--
--   supabase
--     .channel('project-status')
--     .on('postgres_changes', {
--       event: 'UPDATE',
--       schema: 'public',
--       table: 'processing_jobs',
--       filter: `project_id=eq.${projectId}`
--     }, handler)
--     .subscribe()
--
-- Realtime respects RLS: users only receive events for their own rows
-- because the authenticated JWT is used to filter at the publication level.
