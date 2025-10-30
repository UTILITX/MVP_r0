-- Create the main tables for UTILITX
-- Run this first to set up the database schema

-- Work Areas table
create table if not exists work_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  geom geometry(Polygon, 4326) not null,
  created_at timestamptz default now()
);

-- Records table (uploaded files with metadata)
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  work_area_id uuid references work_areas(id) on delete cascade,
  record_type text not null,
  file_name text not null,
  file_url text not null,
  geojson jsonb,
  created_at timestamptz default now()
);

-- Share Links table
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  work_area_id uuid references work_areas(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- View for work area record counts
create or replace view v_work_area_record_counts as
select 
  wa.id,
  wa.name,
  wa.created_at,
  count(r.id) as record_count
from work_areas wa
left join records r on r.work_area_id = wa.id
group by wa.id, wa.name, wa.created_at;

-- Create indexes for better performance
create index if not exists idx_records_work_area_id on records(work_area_id);
create index if not exists idx_share_links_token on share_links(token);
create index if not exists idx_share_links_work_area_id on share_links(work_area_id);
