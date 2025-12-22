-- Add missing 'type' column to domains table
DO $$
BEGIN
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'cname';
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Column already exists in domains.';
END $$;
