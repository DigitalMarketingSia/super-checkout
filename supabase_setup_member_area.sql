-- 1. Create member_areas table
CREATE TABLE IF NOT EXISTS member_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain_id UUID REFERENCES domains(id),
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#E50914',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE member_areas ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for member_areas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'member_areas' AND policyname = 'Users can view their own member areas') THEN
        CREATE POLICY "Users can view their own member areas" ON member_areas FOR SELECT USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'member_areas' AND policyname = 'Users can insert their own member areas') THEN
        CREATE POLICY "Users can insert their own member areas" ON member_areas FOR INSERT WITH CHECK (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'member_areas' AND policyname = 'Users can update their own member areas') THEN
        CREATE POLICY "Users can update their own member areas" ON member_areas FOR UPDATE USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'member_areas' AND policyname = 'Users can delete their own member areas') THEN
        CREATE POLICY "Users can delete their own member areas" ON member_areas FOR DELETE USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'member_areas' AND policyname = 'Public can view member areas by slug') THEN
        CREATE POLICY "Public can view member areas by slug" ON member_areas FOR SELECT USING (true);
    END IF;
END
$$;

-- 4. Create Storage Bucket 'member-areas'
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-areas', 'member-areas', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Storage Policies for 'member-areas'
DO $$
BEGIN
    -- Public Read Access
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access Member Areas') THEN
        CREATE POLICY "Public Access Member Areas" ON storage.objects FOR SELECT
        USING ( bucket_id = 'member-areas' );
    END IF;

    -- Authenticated Upload Access
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Upload Member Areas') THEN
        CREATE POLICY "Authenticated Upload Member Areas" ON storage.objects FOR INSERT
        WITH CHECK ( bucket_id = 'member-areas' AND auth.role() = 'authenticated' );
    END IF;

    -- Authenticated Update Access
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated Update Member Areas') THEN
        CREATE POLICY "Authenticated Update Member Areas" ON storage.objects FOR UPDATE
        USING ( bucket_id = 'member-areas' AND auth.role() = 'authenticated' );
    END IF;
END
$$;
