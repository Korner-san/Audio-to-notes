-- ============================================================
-- 010_exports.sql
-- Generated export files (MIDI / MusicXML / PDF) per user request
-- ============================================================

create table public.exports (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,

  -- ── What is being exported ────────────────────────────────────────────
  -- stem_id NULL = full-project export (all stems merged)
  stem_id             uuid references public.audio_stems (id) on delete set null,
  score_id            uuid references public.scores (id) on delete set null,

  export_format       public.export_format not null,   -- midi | musicxml | pdf
  include_edits       boolean not null default true,   -- apply note_edits_patch before export

  -- ── Generated file ────────────────────────────────────────────────────
  -- Path inside the "exports" Storage bucket
  storage_path        text,                            -- exports/{user_id}/{export_id}.mid
  storage_bucket      text not null default 'exports',
  file_size_bytes     bigint,
  original_filename   text,                            -- suggested download filename

  -- ── Signed URL cache ─────────────────────────────────────────────────
  -- Pre-generated signed URL for download (cached to avoid repeated Storage calls)
  signed_url          text,
  signed_url_expires_at timestamptz,

  -- ── Lifecycle ─────────────────────────────────────────────────────────
  status              public.export_status not null default 'pending',
  error_message       text,

  requested_at        timestamptz not null default now(),
  generated_at        timestamptz,                     -- when file was written to Storage
  expires_at          timestamptz                      -- when we'll purge from Storage (TTL)
                        default (now() + interval '7 days'),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.exports is
  'Each row is one user-initiated export request. Files are stored temporarily (7 days default) then purged.';

comment on column public.exports.include_edits is
  'If true, note_edits_patch from scores is applied before generating the file.';

comment on column public.exports.signed_url_expires_at is
  'Signed URL validity (Supabase default max is 1 week). Regenerated on demand if expired.';

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_exports_updated_at
  before update on public.exports
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.exports enable row level security;

create policy "exports: owner can select"
  on public.exports for select
  using (auth.uid() = user_id);

create policy "exports: owner can insert"
  on public.exports for insert
  with check (auth.uid() = user_id);

create policy "exports: owner can delete"
  on public.exports for delete
  using (auth.uid() = user_id);
