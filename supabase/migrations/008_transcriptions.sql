-- ============================================================
-- 008_transcriptions.sql
-- MIDI transcription results produced by Basic-pitch (one per stem)
-- ============================================================

create table public.transcriptions (
  id                    uuid primary key default uuid_generate_v4(),
  stem_id               uuid not null references public.audio_stems (id) on delete cascade,
  project_id            uuid not null references public.projects (id) on delete cascade,
  user_id               uuid not null references public.profiles (id) on delete cascade,

  -- ── Instrument classification ──────────────────────────────────────────
  instrument_type       public.instrument_type not null default 'unknown',
  confidence_score      numeric(5, 4)                -- 0.0000–1.0000 (Basic-pitch confidence)
                          check (confidence_score between 0 and 1),

  -- ── Musical properties detected ───────────────────────────────────────
  tempo_bpm             numeric(6, 2),               -- detected BPM
  time_sig_numerator    smallint,                    -- e.g. 4
  time_sig_denominator  smallint,                    -- e.g. 4
  key_signature         text,                        -- e.g. "C major", "A minor"
  key_confidence        numeric(5, 4)
                          check (key_confidence between 0 and 1),

  -- ── MIDI file in Storage ───────────────────────────────────────────────
  -- Path inside the "midi-files" Storage bucket
  midi_storage_path     text,                        -- midi-files/{project_id}/{stem_type}.mid
  midi_storage_bucket   text not null default 'midi-files',
  midi_file_size_bytes  bigint,

  -- ── Inline MIDI data (for editor, avoids Storage round-trip) ──────────
  -- Compact JSON representation of all notes
  midi_data             jsonb,
  -- Shape: {
  --   "tempo": 120,
  --   "timeSignature": {"numerator": 4, "denominator": 4},
  --   "keySignature": "C major",
  --   "tracks": [{
  --     "name": "Piano",
  --     "notes": [{
  --       "pitch": 60,          -- MIDI note number (C4)
  --       "startTimeSec": 0.0,
  --       "durationSec": 0.5,
  --       "velocity": 80,
  --       "startBeat": 0.0,
  --       "durationBeats": 1.0
  --     }]
  --   }]
  -- }

  -- ── Transcription metadata ────────────────────────────────────────────
  transcription_model   text,                        -- e.g. "basic-pitch-v1"
  note_count            integer,                     -- total notes detected
  onset_threshold       numeric(4, 3),               -- Basic-pitch param used
  frame_threshold       numeric(4, 3),
  minimum_note_length   integer,                     -- ms

  -- ── Lifecycle ─────────────────────────────────────────────────────────
  status                public.stem_status not null default 'pending',
  error_message         text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- One transcription per stem
  unique (stem_id)
);

comment on table public.transcriptions is
  'MIDI transcription output from Basic-pitch for one stem. Includes both a Storage file and inline jsonb note data.';

comment on column public.transcriptions.midi_data is
  'Denormalised MIDI note data in jsonb. Editor reads this directly; edits are stored as patches in scores.note_edits_patch.';

comment on column public.transcriptions.confidence_score is
  'Aggregate confidence from Basic-pitch (0–1). Low confidence (<0.5) may indicate poor separation quality.';

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_transcriptions_updated_at
  before update on public.transcriptions
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.transcriptions enable row level security;

create policy "transcriptions: owner can select"
  on public.transcriptions for select
  using (auth.uid() = user_id);

create policy "transcriptions: owner can update"
  on public.transcriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
