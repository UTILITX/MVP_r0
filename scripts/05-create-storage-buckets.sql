-- Create storage buckets for file uploads
-- Run this to set up both public and private storage buckets

-- Create public bucket (legacy mode)
insert into storage.buckets (id, name, public)
values ('records', 'records', true)
on conflict (id) do nothing;

-- Create private bucket (new secure mode)
insert into storage.buckets (id, name, public)
values ('Records_Private', 'Records_Private', false)
on conflict (id) do nothing;

-- Set up storage policies for private bucket
-- Allow authenticated and anon users to upload (for R0 mode)
create policy "Allow uploads to Records_Private"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'Records_Private');

-- Allow service role to read (for signed URL generation)
create policy "Allow service role to read Records_Private"
on storage.objects for select
to service_role
using (bucket_id = 'Records_Private');

-- Allow anon to read via signed URLs (required for createSignedUrl to work)
create policy "Allow anon to read Records_Private via signed URLs"
on storage.objects for select
to anon
using (bucket_id = 'Records_Private');
