-- Add image columns to contents
ALTER TABLE contents ADD COLUMN IF NOT EXISTS image_vertical_url TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS image_horizontal_url TEXT;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS modules_layout TEXT DEFAULT 'horizontal'; -- 'vertical' or 'horizontal'

-- Add image columns to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS image_vertical_url TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS image_horizontal_url TEXT;

-- Add image columns to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS image_url TEXT; -- Card style (horizontal)

-- Add card_style to tracks
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS card_style TEXT DEFAULT 'horizontal'; -- 'vertical' or 'horizontal'
