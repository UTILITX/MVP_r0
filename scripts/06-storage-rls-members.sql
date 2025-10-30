-- Optional: Storage RLS for logged-in users
-- Run this when you want user-level read/write enforced by membership

-- Create work_area_members table to track access
create table if not exists work_area_members (
  work_area_id uuid references work_areas(id) on delete cascade,
  user_id uuid not null,
  role text default 'viewer',
  primary key (work_area_id, user_id)
);

-- Enable RLS on storage objects
alter table storage.objects enable row level security;

-- Helper function to extract work_area_id from storage path
create or replace function public.obj_work_area_id(objname text)
returns uuid language sql immutable as $$
  select nullif(split_part(objname, '/', 1), '')::uuid
$$;

-- Read policy: members can view files in their work areas
create policy "read: members (Records_Private)"
on storage.objects for select to authenticated
using (
  bucket_id = 'Records_Private'
  and exists (
    select 1 from work_area_members m
    where m.work_area_id = obj_work_area_id(name)
      and m.user_id = auth.uid()
  )
);

-- Write policy: members can upload files to their work areas
create policy "write: members (Records_Private)"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'Records_Private'
  and exists (
    select 1 from work_area_members m
    where m.work_area_id = obj_work_area_id(name)
      and m.user_id = auth.uid()
  )
);
