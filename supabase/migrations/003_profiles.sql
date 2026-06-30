-- ============================================================
-- 003_profiles.sql
-- Public user profile that extends auth.users (1-to-1)
-- ============================================================

create table public.profiles (
  -- mirrors auth.users.id exactly — no separate sequence
  id              uuid primary key references auth.users (id) on delete cascade,

  display_name    text,
  avatar_url      text,
  plan            public.plan_type not null default 'free',

  -- soft limits enforced at API layer
  upload_count    integer not null default 0,
  storage_used_bytes bigint not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated user. Created automatically on first sign-up via trigger.';

-- ── Auto-create profile on new auth.users row ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Auto-update updated_at ─────────────────────────────────────────────────
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure extensions.moddatetime(updated_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: owner can read"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No direct insert — handled by trigger
-- No delete — cascade from auth.users
