-- Temporary development policies for Records_Private bucket
-- Use this if you get 401/403 errors during testing
-- Safe for R0 mode (no authentication required)
-- Replace with member-based policies (script 06) when ready for production

-- Ensure RLS is enabled
alter table storage.objects enable row level security;

-- Drop existing policies if they exist (for clean slate)
drop policy if exists "dev-insert (Records_Private)" on storage.objects;
drop policy if exists "dev-select (Records_Private)" on storage.objects;

-- Allow anonymous insert (upload)
create policy "dev-insert (Records_Private)" 
on storage.objects 
for insert 
to anon 
with check (bucket_id = 'Records_Private');

-- Allow anonymous select (view/download via signed URLs)
create policy "dev-select (Records_Private)" 
on storage.objects 
for select 
to anon 
using (bucket_id = 'Records_Private');
