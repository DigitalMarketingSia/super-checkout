-- Create member_areas table
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

-- Enable RLS
ALTER TABLE member_areas ENABLE ROW LEVEL SECURITY;

-- Policies for member_areas
CREATE POLICY "Users can view their own member areas" ON member_areas
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own member areas" ON member_areas
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own member areas" ON member_areas
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own member areas" ON member_areas
  FOR DELETE USING (auth.uid() = owner_id);

-- Public access for slug lookup (needed for student app)
CREATE POLICY "Public can view member areas by slug" ON member_areas
  FOR SELECT USING (true);

-- Storage Policies (if not already existing for 'contents' bucket)
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING ( bucket_id = 'contents' );

-- Allow authenticated upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'contents' AND auth.role() = 'authenticated' );

-- Allow authenticated update
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE
USING ( bucket_id = 'contents' AND auth.role() = 'authenticated' );
