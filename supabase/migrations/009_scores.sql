-- ============================================================
-- 009_scores.sql
-- MusicXML score produced from MIDI, plus user note edits
-- ============================================================

create table public.scores (
  id                    uuid primary key default uuid_generate_v4(),
  transcription_id      uuid not null references public.transcriptions (id) on delete cascade,
  stem_id               uuid not null references public.audio_stems (id) on delete cascade,
  project_id            uuid not null references public.projects (id) on delete cascade,
  user_id               uuid not null references public.profiles (id) on delete cascade,

  -- ── MusicXML file in Storage ───────────────────────────────────────────
  -- Path inside the "musicxml-files" Storage bucket
  musicxml_storage_path text,                       -- musicxml-files/{project_id}/{stem_type}.xml
  musicxml_storage_bucket text not null default 'musicxml-files',
  musicxml_file_size_bytes bigint,

  -- ── Inline content (small scores only, <100 KB) ───────────────────────
  -- NULL for large scores — browser fetches from Storage instead
  musicxml_content      text,

  -- ── Note editing (RFC 6902 JSON Patch) ───────────────────────────────
  -- Accumulated patch applied on top of the base midi_data from transcriptions
  -- Shape: [{"op":"replace","path":"/tracks/0/notes/3/pitch","value":62}, ...]
  note_edits_patch      jsonb not null default '[]'::jsonb,

  -- Recomputed MusicXML after edits are applied (nullable — generated lazily)
  edited_musicxml_storage_path text,

  -- ── Score rendering hints ─────────────────────────────────────────────
  clef                  text default 'treble',      -- treble | bass | alto | percussion
  transpose_semitones   smallint not null default 0,
  show_chord_symbols    boolean not null default false,
  show_fingerings       boolean not null default false,

  -- ── Generation metadata ───────────────────────────────────────────────
  conversion_model      text,                       -- e.g. "music21-v9"
  version               smallint not null default 1, -- increments on each edit save

  status                public.score_status not null default 'pending',
  error_message         text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- One score per stem (the "current working copy")
  unique (stem_id)
);

comment on table public.scores is
  'MusicXML score for one stem. note_edits_patch accumulates user edits as RFC 6902 JSON Patch.';

comment on column public.scores.note_edits_patch is
  'RFC 6902 JSON Patch array applied on top of transcriptions.midi_data. Append-only in practice; the API applies and stores the merged result.';

comment on column public.scores.version is
  'Increments on each successful edit save. Used for optimistic concurrency in the editor.';

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_scores_updated_at
  before update on public.scores
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.scores enable row level security;

create policy "scores: owner can select"
  on public.scores for select
  using (auth.uid() = user_id);

create policy "scores: owner can update"
  on public.scores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts done by worker via service role
