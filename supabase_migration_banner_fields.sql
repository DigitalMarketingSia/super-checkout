-- Add Banner Customization Fields to Member Areas

ALTER TABLE member_areas
ADD COLUMN IF NOT EXISTS banner_title TEXT,
ADD COLUMN IF NOT EXISTS banner_description TEXT,
ADD COLUMN IF NOT EXISTS banner_button_text TEXT,
ADD COLUMN IF NOT EXISTS banner_button_link TEXT;
