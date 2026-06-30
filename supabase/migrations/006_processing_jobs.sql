-- ============================================================
-- 006_processing_jobs.sql
-- Tracks the asynchronous ML pipeline job for each project
-- ============================================================

create table public.processing_jobs (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  audio_upload_id     uuid not null references public.audio_uploads (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,

  -- ── Pipeline status ────────────────────────────────────────────────────
  --   uploaded          → job created, worker not yet picked it up
  --   separating        → Demucs is running stem separation
  --   transcribing      → Basic-pitch is converting stems to MIDI
  --   generating_score  → music21 is converting MIDI to MusicXML
  --   completed         → all stages finished, results available
  --   failed            → unrecoverable error
  status              public.job_status not null default 'uploaded',

  progress_pct        smallint not null default 0
                        check (progress_pct between 0 and 100),

  -- ── External queue reference ───────────────────────────────────────────
  external_job_id     text,                     -- Trigger.dev / Modal run ID
  worker_node         text,                     -- which worker host handled it

  -- ── Error detail ──────────────────────────────────────────────────────
  error_code          text,                     -- machine-readable e.g. "STEM_SEPARATION_OOM"
  error_message       text,                     -- human-readable detail
  failed_stage        public.job_status,        -- which stage failed

  -- ── Log tail ──────────────────────────────────────────────────────────
  log_tail            text,                     -- last ~2 KB of worker stderr (for support)

  -- ── Retry tracking ────────────────────────────────────────────────────
  attempt_number      smallint not null default 1,
  max_attempts        smallint not null default 3,
  next_retry_at       timestamptz,

  -- ── Timing ────────────────────────────────────────────────────────────
  queued_at           timestamptz not null default now(),
  started_at          timestamptz,
  separation_done_at  timestamptz,
  transcription_done_at timestamptz,
  score_done_at       timestamptz,
  completed_at        timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.processing_jobs is
  'One row per processing attempt. Retries produce a new row (attempt_number increments).';

comment on column public.processing_jobs.status is
  'Enum progression: uploaded → separating → transcribing → generating_score → completed | failed';

-- ── Propagate job status to parent project ─────────────────────────────────
create or replace function public.sync_project_status_from_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_status public.project_status;
begin
  -- Map job_status to project_status
  v_project_status := case new.status
    when 'uploaded'          then 'processing'
    when 'separating'        then 'processing'
    when 'transcribing'      then 'processing'
    when 'generating_score'  then 'processing'
    when 'completed'         then 'completed'
    when 'failed'            then 'failed'
    else 'processing'
  end;

  update public.projects
  set
    status     = v_project_status,
    updated_at = now()
  where id = new.project_id;

  return new;
end;
$$;

create trigger sync_project_status
  after insert or update of status on public.processing_jobs
  for each row execute procedure public.sync_project_status_from_job();

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_processing_jobs_updated_at
  before update on public.processing_jobs
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.processing_jobs enable row level security;

-- Users can read their own jobs (for status polling)
create policy "processing_jobs: owner can select"
  on public.processing_jobs for select
  using (auth.uid() = user_id);

-- Jobs are created server-side only (service role key in API routes)
-- No insert/update policy for anon or authenticated — service role bypasses RLS

-- Service role webhook can update job status — no row policy needed (bypasses RLS)
-- If using authenticated role for worker callbacks, add:
-- create policy "processing_jobs: service can update"
--   on public.processing_jobs for update
--   using (true);  -- restrict further with a service account check
