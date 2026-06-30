-- ============================================================
-- seed.sql
-- Development-only seed data
-- Run: supabase db reset  (applies migrations + this seed)
-- ============================================================

-- !! Do NOT run in production !!

-- Insert a test user (auth.users is managed by GoTrue — use the Supabase
-- dashboard or supabase.auth.signUp() in your app for real users).
-- The handle_new_user trigger will auto-create a profiles row.

-- Example: manually insert a profile for a pre-existing auth user
-- (replace the UUID with one from your auth.users table)
--
-- insert into public.profiles (id, display_name, plan)
-- values ('00000000-0000-0000-0000-000000000001', 'Test User', 'pro')
-- on conflict (id) do nothing;

-- Verify enum values load correctly
select
  'plan_type'       as enum_name, unnest(enum_range(null::public.plan_type))::text   as value
union all select 'job_status',    unnest(enum_range(null::public.job_status))::text
union all select 'stem_type',     unnest(enum_range(null::public.stem_type))::text
union all select 'export_format', unnest(enum_range(null::public.export_format))::text
order by enum_name, value;
