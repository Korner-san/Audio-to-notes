-- ============================================================
-- 013_functions.sql
-- Helper database functions and cleanup utilities
-- ============================================================

-- ── 1. get_project_summary ─────────────────────────────────────────────────
-- Returns a project with aggregated stem/transcription counts.
-- Used by the dashboard API to avoid N+1 queries.
create or replace function public.get_project_summary(p_project_id uuid)
returns table (
  project_id          uuid,
  title               text,
  status              public.project_status,
  duration_seconds    numeric,
  bpm                 numeric,
  stem_count          bigint,
  completed_stems     bigint,
  failed_stems        bigint,
  has_scores          boolean,
  created_at          timestamptz,
  updated_at          timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.title,
    p.status,
    p.duration_seconds,
    p.bpm,
    count(s.id)                                            as stem_count,
    count(s.id) filter (where s.status = 'completed')     as completed_stems,
    count(s.id) filter (where s.status = 'failed')        as failed_stems,
    exists (
      select 1 from public.scores sc
      where sc.project_id = p.id and sc.status = 'generated'
    )                                                      as has_scores,
    p.created_at,
    p.updated_at
  from public.projects p
  left join public.audio_stems s on s.project_id = p.id
  where p.id = p_project_id
    and p.user_id = auth.uid()               -- enforces ownership
  group by p.id;
$$;

-- ── 2. apply_note_edit ─────────────────────────────────────────────────────
-- Atomically appends a JSON Patch operation to scores.note_edits_patch
-- and increments the version counter (optimistic concurrency).
create or replace function public.apply_note_edit(
  p_score_id       uuid,
  p_patch          jsonb,         -- array of RFC 6902 operations
  p_expected_version smallint     -- client's current version (for OCC)
)
returns table (new_version smallint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_version smallint;
begin
  -- Lock the row
  select version into v_existing_version
  from public.scores
  where id = p_score_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Score not found or access denied' using errcode = 'P0001';
  end if;

  if v_existing_version <> p_expected_version then
    raise exception 'Version conflict: expected %, got %', p_expected_version, v_existing_version
      using errcode = 'P0002';
  end if;

  update public.scores
  set
    note_edits_patch = note_edits_patch || p_patch,   -- append new ops
    version          = version + 1,
    status           = 'edited',
    updated_at       = now()
  where id = p_score_id
  returning version, updated_at
  into new_version, updated_at;

  return next;
end;
$$;

-- ── 3. increment_storage_used ──────────────────────────────────────────────
-- Called by API after a confirmed upload to track quota.
create or replace function public.increment_storage_used(
  p_user_id         uuid,
  p_delta_bytes     bigint
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    storage_used_bytes = greatest(0, storage_used_bytes + p_delta_bytes),
    upload_count       = upload_count + (case when p_delta_bytes > 0 then 1 else 0 end),
    updated_at         = now()
  where id = p_user_id;
$$;

-- ── 4. cleanup_stalled_jobs ────────────────────────────────────────────────
-- Marks jobs stuck in a processing stage for >2 hours as failed.
-- Called by a Supabase pg_cron job (see 014_cron.sql).
create or replace function public.cleanup_stalled_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.processing_jobs
  set
    status        = 'failed',
    error_code    = 'STALLED',
    error_message = 'Job exceeded 2-hour processing limit and was automatically failed.',
    updated_at    = now()
  where status in ('separating', 'transcribing', 'generating_score')
    and started_at < now() - interval '2 hours';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── 5. cleanup_expired_exports ─────────────────────────────────────────────
-- Marks expired export rows. Actual Storage deletion is handled by the API.
create or replace function public.cleanup_expired_exports()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.exports
  set
    status     = 'expired',
    updated_at = now()
  where status = 'completed'
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
