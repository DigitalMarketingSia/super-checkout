-- Execute this in the Supabase SQL Editor of the CLIENT'S project
-- This fixes the issue where modules/lessons created before the column existed are hidden
-- or where the default 'false' value is preventing them from showing up.

UPDATE modules SET is_published = true WHERE is_published IS NULL OR is_published = false;
UPDATE lessons SET is_published = true WHERE is_published IS NULL OR is_published = false;

NOTIFY pgrst, 'reload schema';
