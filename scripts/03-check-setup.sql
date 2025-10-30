-- Diagnostic queries to verify setup
-- Run this to check if everything is configured correctly

-- 1) Check if tables exist
select to_regclass('public.work_areas') as work_areas_exists,
       to_regclass('public.records') as records_exists,
       to_regclass('public.share_links') as share_links_exists;

-- 2) Check RLS status (should be false for R0)
select relname as table_name, 
       relrowsecurity as rls_enabled
from pg_class
where relname in ('work_areas', 'records', 'share_links')
  and relnamespace = 'public'::regnamespace;

-- 3) Check row counts
select 'work_areas' as table_name, count(*) as row_count from work_areas
union all
select 'records', count(*) from records
union all
select 'share_links', count(*) from share_links;

-- 4) Check permissions for anon role
select 
  schemaname,
  tablename,
  has_table_privilege('anon', schemaname || '.' || tablename, 'SELECT') as can_select,
  has_table_privilege('anon', schemaname || '.' || tablename, 'INSERT') as can_insert
from pg_tables
where schemaname = 'public'
  and tablename in ('work_areas', 'records', 'share_links');
