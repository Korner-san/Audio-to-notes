-- ============================================================
-- 002_enums.sql
-- Domain enumerations used across all tables
-- ============================================================

-- User subscription tier
create type public.plan_type as enum (
  'free',
  'pro'
);

-- Top-level project lifecycle
create type public.project_status as enum (
  'draft',
  'processing',
  'completed',
  'failed',
  'archived'
);

-- Raw audio upload lifecycle
create type public.upload_status as enum (
  'pending',      -- signed URL issued, upload not yet confirmed
  'uploading',    -- client is streaming
  'completed',    -- file confirmed in Storage
  'failed'
);

-- Processing job pipeline stages (in order)
create type public.job_status as enum (
  'uploaded',           -- audio confirmed, job not yet picked up
  'separating',         -- Demucs stem separation running
  'transcribing',       -- Basic-pitch MIDI transcription running
  'generating_score',   -- music21 MusicXML conversion running
  'completed',          -- all stages done successfully
  'failed'              -- unrecoverable error (see error_message)
);

-- Which stem a track represents
create type public.stem_type as enum (
  'vocals',
  'bass',
  'drums',
  'other',
  'piano',
  'guitar'
);

-- Per-stem processing status
create type public.stem_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Instrument label produced by the transcriber
create type public.instrument_type as enum (
  'vocals',
  'bass',
  'electric_guitar',
  'acoustic_guitar',
  'piano',
  'drums',
  'strings',
  'brass',
  'woodwind',
  'synth',
  'unknown'
);

-- Score editing/generation lifecycle
create type public.score_status as enum (
  'pending',
  'generated',
  'edited',       -- user has applied note edits
  'failed'
);

-- Export output format
create type public.export_format as enum (
  'midi',
  'musicxml',
  'pdf'
);

-- Export file lifecycle
create type public.export_status as enum (
  'pending',
  'generating',
  'completed',
  'failed',
  'expired'       -- signed URL has lapsed
);
