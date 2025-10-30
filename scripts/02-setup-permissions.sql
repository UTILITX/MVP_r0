-- Set up permissions for anonymous access (R0-friendly)
-- Run this after creating tables

-- Grant usage on schema
grant usage on schema public to anon;

-- Grant select permissions on tables
grant select on table work_areas to anon;
grant select on table records to anon;
grant select on table share_links to anon;
grant select on table v_work_area_record_counts to anon;

-- Grant insert/update/delete for anon (needed for the app to work)
grant insert, update, delete on table work_areas to anon;
grant insert, update, delete on table records to anon;
grant insert, update, delete on table share_links to anon;

-- Make future tables readable
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant insert, update, delete on tables to anon;

-- Disable RLS for R0 (development/demo mode)
alter table work_areas disable row level security;
alter table records disable row level security;
alter table share_links disable row level security;
