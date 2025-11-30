alter table lessons 
add column if not exists content_order jsonb default '["video", "text", "file", "gallery"]'::jsonb;
