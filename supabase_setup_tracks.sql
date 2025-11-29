-- 1. Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('products', 'contents', 'modules', 'lessons')),
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create track_items table
CREATE TABLE IF NOT EXISTS track_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  item_id UUID NOT NULL, -- Polymorphic ID (product_id, content_id, module_id, lesson_id)
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for tracks
DO $$
BEGIN
    -- Public read access for tracks (needed for member area view)
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'tracks' AND policyname = 'Public can view visible tracks') THEN
        CREATE POLICY "Public can view visible tracks" ON tracks FOR SELECT USING (is_visible = true);
    END IF;

    -- Admin full access for tracks
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'tracks' AND policyname = 'Admins can manage tracks') THEN
        CREATE POLICY "Admins can manage tracks" ON tracks FOR ALL USING (
            EXISTS (
                SELECT 1 FROM member_areas ma
                WHERE ma.id = tracks.member_area_id
                AND ma.owner_id = auth.uid()
            )
        );
    END IF;
END
$$;

-- 5. Create RLS Policies for track_items
DO $$
BEGIN
    -- Public read access for track_items
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'track_items' AND policyname = 'Public can view track items') THEN
        CREATE POLICY "Public can view track items" ON track_items FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM tracks
                WHERE tracks.id = track_items.track_id
                AND tracks.is_visible = true
            )
        );
    END IF;

    -- Admin full access for track_items
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'track_items' AND policyname = 'Admins can manage track items') THEN
        CREATE POLICY "Admins can manage track items" ON track_items FOR ALL USING (
            EXISTS (
                SELECT 1 FROM tracks
                JOIN member_areas ma ON ma.id = tracks.member_area_id
                WHERE tracks.id = track_items.track_id
                AND ma.owner_id = auth.uid()
            )
        );
    END IF;
END
$$;
