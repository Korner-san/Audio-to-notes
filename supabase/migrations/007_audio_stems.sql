-- ============================================================
-- 007_audio_stems.sql
-- Separated stem audio files produced by Demucs
-- One row per stem per project
-- ============================================================

create table public.audio_stems (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  processing_job_id   uuid not null references public.processing_jobs (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,

  -- ── Stem identity ──────────────────────────────────────────────────────
  stem_type           public.stem_type not null,  -- vocals | bass | drums | other | piano | guitar
  display_name        text,                        -- e.g. "Vocals", overridable by user
  is_muted            boolean not null default false,  -- editor mute toggle

  -- ── Source audio file ─────────────────────────────────────────────────
  -- Path inside the "audio-stems" Storage bucket
  storage_path        text,                       -- audio-stems/{project_id}/{stem_type}.wav
  storage_bucket      text not null default 'audio-stems',
  file_size_bytes     bigint,
  duration_seconds    numeric(10, 3),
  sample_rate_hz      integer,

  -- ── Quality metrics from Demucs ───────────────────────────────────────
  separation_model    text,                       -- e.g. "htdemucs", "htdemucs_6s"
  sdr_score           numeric(6, 3),              -- Signal-to-Distortion Ratio (higher = better)

  -- ── Lifecycle ─────────────────────────────────────────────────────────
  status              public.stem_status not null default 'pending',
  error_message       text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One row per stem type per project
  unique (project_id, stem_type)
);

comment on table public.audio_stems is
  'Each row is one separated stem (e.g. vocals.wav) produced by Demucs for a project.';

comment on column public.audio_stems.sdr_score is
  'Signal-to-Distortion Ratio from Demucs. Indicates separation quality; >10 dB is good.';

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_audio_stems_updated_at
  before update on public.audio_stems
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.audio_stems enable row level security;

create policy "audio_stems: owner can select"
  on public.audio_stems for select
  using (auth.uid() = user_id);

create policy "audio_stems: owner can update"
  on public.audio_stems for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Insert and bulk-update done by worker via service role (bypasses RLS)
