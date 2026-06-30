-- ============================================================
-- 011_indexes.sql
-- Performance indexes for common query patterns
-- ============================================================

-- ── profiles ───────────────────────────────────────────────────────────────
-- (primary key index already covers id lookup)

-- ── projects ───────────────────────────────────────────────────────────────

-- Dashboard: list user's projects ordered by newest first
create index idx_projects_user_id_created_at
  on public.projects (user_id, created_at desc);

-- Filter by status (e.g. show only "processing" jobs)
create index idx_projects_user_id_status
  on public.projects (user_id, status);

-- ── audio_uploads ──────────────────────────────────────────────────────────

-- Look up upload for a given project (usually 1-to-1)
create index idx_audio_uploads_project_id
  on public.audio_uploads (project_id);

-- Look up by user for storage quota accounting
create index idx_audio_uploads_user_id
  on public.audio_uploads (user_id);

-- ── processing_jobs ────────────────────────────────────────────────────────

-- Status polling from browser: GET /api/jobs?projectId=...
create index idx_processing_jobs_project_id_status
  on public.processing_jobs (project_id, status);

-- Worker retry queue: find jobs that need retrying
create index idx_processing_jobs_next_retry_at
  on public.processing_jobs (next_retry_at)
  where status = 'failed' and attempt_number < max_attempts;

-- Look up by external job ID (Trigger.dev webhook callback)
create index idx_processing_jobs_external_job_id
  on public.processing_jobs (external_job_id)
  where external_job_id is not null;

-- ── audio_stems ────────────────────────────────────────────────────────────

-- Fetch all stems for a project (main editor query)
create index idx_audio_stems_project_id
  on public.audio_stems (project_id);

-- Look up specific stem type within a project
create index idx_audio_stems_project_id_stem_type
  on public.audio_stems (project_id, stem_type);

-- Find stalled stems (for cleanup cron)
create index idx_audio_stems_status
  on public.audio_stems (status)
  where status in ('pending', 'processing');

-- ── transcriptions ─────────────────────────────────────────────────────────

-- Fetch transcription for a stem (editor load)
create index idx_transcriptions_stem_id
  on public.transcriptions (stem_id);

-- Fetch all transcriptions for a project
create index idx_transcriptions_project_id
  on public.transcriptions (project_id);

-- GIN index on midi_data jsonb for note-level queries
-- (useful for analytics: "how many notes in total?" etc.)
create index idx_transcriptions_midi_data_gin
  on public.transcriptions using gin (midi_data);

-- ── scores ─────────────────────────────────────────────────────────────────

-- Fetch score for a stem (editor load)
create index idx_scores_stem_id
  on public.scores (stem_id);

-- Fetch all scores for a project
create index idx_scores_project_id
  on public.scores (project_id);

-- GIN index on note_edits_patch for debugging / analytics
create index idx_scores_note_edits_patch_gin
  on public.scores using gin (note_edits_patch);

-- ── exports ────────────────────────────────────────────────────────────────

-- List user's exports
create index idx_exports_user_id_created_at
  on public.exports (user_id, created_at desc);

-- Cleanup cron: find expired exports
create index idx_exports_expires_at
  on public.exports (expires_at)
  where status = 'completed';

-- Find exports for a project
create index idx_exports_project_id
  on public.exports (project_id);
