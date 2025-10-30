-- Optional: Add demo data for testing
-- Run this to populate the database with sample data

-- Insert a demo work area
insert into work_areas (id, name, geom)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Block',
  ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-122.4194,37.7749],[-122.4194,37.7759],[-122.4184,37.7759],[-122.4184,37.7749],[-122.4194,37.7749]]]}')
)
on conflict (id) do nothing;
