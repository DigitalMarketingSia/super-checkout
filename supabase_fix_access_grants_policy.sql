-- Fix missing RLS policy for access_grants
-- This allows members to read their own access grants (purchases)

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own grants" ON access_grants;
    CREATE POLICY "Users can view their own grants" ON access_grants FOR SELECT USING (auth.uid() = user_id);
END $$;
