-- Add banner_url to member_areas
ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS banner_url TEXT;
