-- Add login_image_url and allow_free_signup to member_areas
ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS login_image_url TEXT;
ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS allow_free_signup BOOLEAN DEFAULT TRUE;

-- Add is_free to contents
ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
