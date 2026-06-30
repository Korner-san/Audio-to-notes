-- ============================================================
-- 005_audio_uploads.sql
-- Raw audio file metadata for every file a user uploads
-- ============================================================

create table public.audio_uploads (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,

  -- ── Original file metadata ──────────────────────────────────────────────
  original_filename   text not null,            -- e.g. "my_song.mp3"
  file_size_bytes     bigint not null,
  mime_type           text not null,            -- e.g. "audio/mpeg"
  duration_seconds    numeric(10, 3),           -- filled by worker after probe
  sample_rate_hz      integer,                  -- e.g. 44100
  channels            smallint,                 -- 1 = mono, 2 = stereo
  bit_depth           smallint,                 -- e.g. 16, 24, 32
  bit_rate_kbps       integer,

  -- ── Storage location ───────────────────────────────────────────────────
  -- Path inside the "audio-raw" Supabase Storage bucket
  storage_path        text not null,            -- audio-raw/{user_id}/{project_id}/{uuid}.mp3
  storage_bucket      text not null default 'audio-raw',

  -- ── Upload lifecycle ───────────────────────────────────────────────────
  upload_status       public.upload_status not null default 'pending',
  upload_confirmed_at timestamptz,              -- set by /api/upload/confirm
  checksum_md5        text,                     -- optional integrity check

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.audio_uploads is
  'Stores metadata for each audio file uploaded. One project typically has one upload.';

comment on column public.audio_uploads.storage_path is
  'Object path inside the audio-raw Storage bucket. Never expose publicly — use signed URLs.';

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_audio_uploads_updated_at
  before update on public.audio_uploads
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.audio_uploads enable row level security;

create policy "audio_uploads: owner can select"
  on public.audio_uploads for select
  using (auth.uid() = user_id);

create policy "audio_uploads: owner can insert"
  on public.audio_uploads for insert
  with check (auth.uid() = user_id);

create policy "audio_uploads: owner can update"
  on public.audio_uploads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "audio_uploads: owner can delete"
  on public.audio_uploads for delete
  using (auth.uid() = user_id);
