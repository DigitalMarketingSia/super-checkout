-- Add is_free column to modules table
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
