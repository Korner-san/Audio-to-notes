-- ============================================================
-- 004_projects.sql
-- Top-level container for a user's transcription session
-- ============================================================

create table public.projects (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles (id) on delete cascade,

  title           text not null default 'Untitled Project',
  description     text,
  status          public.project_status not null default 'draft',

  -- Denormalised for quick dashboard queries without joining audio_uploads
  audio_filename  text,                         -- original file name shown in UI
  duration_seconds numeric(10, 3),              -- filled after upload is confirmed
  bpm             numeric(6, 2),                -- filled after transcription

  -- Soft-deleted
  archived_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.projects is
  'Each row represents one audio file the user wants to transcribe.';

comment on column public.projects.status is
  'Mirrors the latest processing_jobs.status for this project.';

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.projects enable row level security;

create policy "projects: owner can select"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "projects: owner can insert"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "projects: owner can update"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects: owner can delete"
  on public.projects for delete
  using (auth.uid() = user_id);
