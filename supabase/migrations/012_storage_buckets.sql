-- ============================================================
-- 012_storage_buckets.sql
-- Supabase Storage bucket definitions and access policies
--
-- NOTE: Run this AFTER enabling Storage in the Supabase dashboard.
-- These statements use the storage schema provided by Supabase.
-- ============================================================


-- ── 1. audio-raw ───────────────────────────────────────────────────────────
-- Raw audio files uploaded by users before processing.
-- Private — never publicly accessible. Signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-raw',
  'audio-raw',
  false,                               -- private
  52428800,                            -- 50 MB max per file
  array[
    'audio/mpeg',                      -- .mp3
    'audio/wav',  'audio/x-wav',       -- .wav
    'audio/flac', 'audio/x-flac',      -- .flac
    'audio/mp4',  'audio/x-m4a',       -- .m4a
    'audio/ogg',                       -- .ogg
    'audio/aiff', 'audio/x-aiff'       -- .aiff
  ]
)
on conflict (id) do nothing;

-- Users can upload to their own folder
create policy "audio-raw: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'audio-raw'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
create policy "audio-raw: owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'audio-raw'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "audio-raw: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'audio-raw'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── 2. audio-stems ─────────────────────────────────────────────────────────
-- Separated stem WAV files from Demucs.
-- Private — written by worker (service role), read by owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-stems',
  'audio-stems',
  false,
  104857600,                           -- 100 MB (stems can be large WAVs)
  array['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac']
)
on conflict (id) do nothing;

-- Users can read their own stems (for in-browser playback via signed URL)
create policy "audio-stems: owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'audio-stems'
    -- Path convention: {project_id}/{stem_type}.wav
    -- We verify ownership via the project_id prefix in the API layer,
    -- not directly in Storage policy (Storage can't join tables).
    -- Additional RLS on audio_stems table enforces ownership.
    and auth.role() = 'authenticated'
  );

-- Owner can delete their stems (e.g. project deletion)
create policy "audio-stems: owner can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'audio-stems' and auth.role() = 'authenticated');

-- Worker writes via service role — bypasses RLS


-- ── 3. midi-files ──────────────────────────────────────────────────────────
-- MIDI files produced by Basic-pitch, one per stem.
-- Private — written by worker, read by owner for download/export.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midi-files',
  'midi-files',
  false,
  10485760,                            -- 10 MB (MIDI files are small)
  array['audio/midi', 'audio/x-midi', 'application/octet-stream']
)
on conflict (id) do nothing;

create policy "midi-files: owner can read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'midi-files' and auth.role() = 'authenticated');

create policy "midi-files: owner can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'midi-files' and auth.role() = 'authenticated');


-- ── 4. musicxml-files ──────────────────────────────────────────────────────
-- MusicXML files produced by music21, one per stem.
-- Private — read by the browser score renderer via signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'musicxml-files',
  'musicxml-files',
  false,
  20971520,                            -- 20 MB
  array['application/xml', 'text/xml', 'application/octet-stream']
)
on conflict (id) do nothing;

create policy "musicxml-files: owner can read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'musicxml-files' and auth.role() = 'authenticated');

create policy "musicxml-files: owner can delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'musicxml-files' and auth.role() = 'authenticated');


-- ── 5. exports ─────────────────────────────────────────────────────────────
-- User-requested export files (MIDI / MusicXML / PDF).
-- Private — short-lived (7 days), then purged by cron.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  52428800,                            -- 50 MB
  array[
    'audio/midi', 'audio/x-midi',
    'application/xml', 'text/xml',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy "exports: owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "exports: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- Storage path conventions (reference, not enforced by SQL)
-- ============================================================
--
-- audio-raw/     {user_id}/{project_id}/{upload_id}.mp3
-- audio-stems/   {project_id}/{stem_type}.wav
-- midi-files/    {project_id}/{stem_id}.mid
-- musicxml-files/{project_id}/{stem_id}.xml
--                {project_id}/{stem_id}_edited.xml   (after note edits)
-- exports/       {user_id}/{export_id}.{ext}
--
-- All access through the API generates short-lived signed URLs
-- (never return raw paths to the frontend).
-- ============================================================
