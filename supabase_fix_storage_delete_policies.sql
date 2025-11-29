-- Fix Storage Deletion Permissions
-- Add DELETE policies for 'member-areas' and 'contents' buckets

-- 1. Policy for 'member-areas' bucket
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Delete Member Areas') THEN
        CREATE POLICY "Authenticated Delete Member Areas" ON storage.objects FOR DELETE
        USING ( bucket_id = 'member-areas' AND auth.role() = 'authenticated' AND (auth.uid() = owner) );
    END IF;
END
$$;

-- 2. Policy for 'contents' bucket
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Delete Contents') THEN
        CREATE POLICY "Authenticated Delete Contents" ON storage.objects FOR DELETE
        USING ( bucket_id = 'contents' AND auth.role() = 'authenticated' AND (auth.uid() = owner) );
    END IF;
END
$$;
