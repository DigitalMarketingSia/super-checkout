-- Add Sidebar Configuration to Member Areas

ALTER TABLE member_areas
ADD COLUMN IF NOT EXISTS sidebar_config JSONB DEFAULT '[]'::jsonb;
