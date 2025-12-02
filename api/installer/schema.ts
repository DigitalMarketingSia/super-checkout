export const schemaSql = \`-- Super Checkout - Consolidated Database Schema
-- Generated for Self-Hosted Installer

-- ==========================================
-- 1. EXTENSIONS & CONFIGURATION
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 2. TABLES
-- ==========================================

-- 2.1. Domains (Custom Domains)
CREATE TABLE IF NOT EXISTS domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending_verification', -- pending_verification, active, invalid
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2. Member Areas (Portals)
CREATE TABLE IF NOT EXISTS member_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain_id UUID REFERENCES domains(id),
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#E50914',
  banner_url TEXT,
  login_image_url TEXT,
  allow_free_signup BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4. Contents (Courses/Bundles)
CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  image_vertical_url TEXT,
  image_horizontal_url TEXT,
  modules_layout TEXT DEFAULT 'horizontal', -- 'vertical' or 'horizontal'
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5. Modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  image_vertical_url TEXT,
  image_horizontal_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6. Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration INTEGER, -- in seconds
  position INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7. Product Contents (Link Products to Contents)
CREATE TABLE IF NOT EXISTS product_contents (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (product_id, content_id)
);

-- 2.8. Checkouts
CREATE TABLE IF NOT EXISTS checkouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  theme JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.9. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id UUID REFERENCES checkouts(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_document TEXT, -- CPF/CNPJ
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- pending, paid, failed, refunded
  payment_method TEXT,
  payment_id TEXT, -- External ID (MercadoPago, etc)
  metadata JSONB,
  customer_user_id UUID REFERENCES auth.users(id), -- Linked user account
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10. Access Grants (User Access to Content)
CREATE TABLE IF NOT EXISTS access_grants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- Optional, if access is product-based
  status TEXT DEFAULT 'active',
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, content_id),
  UNIQUE(user_id, product_id) -- Prevent duplicate grants
);

-- 2.11. Tracks (Member Area Home Organization)
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('products', 'contents', 'modules', 'lessons')),
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  card_style TEXT DEFAULT 'horizontal', -- 'vertical' or 'horizontal'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12. Track Items
CREATE TABLE IF NOT EXISTS track_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  item_id UUID NOT NULL, -- Polymorphic ID
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.13. Licenses (System Licensing)
CREATE TABLE IF NOT EXISTS licenses (
  key UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'refunded')),
  allowed_domain TEXT,
  plan TEXT DEFAULT 'lifetime',
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.14. Validation Logs
CREATE TABLE IF NOT EXISTS validation_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_key UUID REFERENCES licenses(key),
  ip_address TEXT,
  domain TEXT,
  user_agent TEXT,
  valid BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. FUNCTIONS & TRIGGERS
-- ==========================================

-- 3.1. Handle New Order Access
CREATE OR REPLACE FUNCTION handle_new_order_access()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_user_id UUID;
  v_content_record RECORD;
BEGIN
  -- Only proceed if status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- 1. Find the product_id from the checkout
    SELECT product_id INTO v_product_id
    FROM checkouts
    WHERE id = NEW.checkout_id;

    -- 2. Find the user_id from auth.users using the email
    -- Note: This assumes the user is already registered with this email.
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.customer_email;

    IF v_product_id IS NOT NULL AND v_user_id IS NOT NULL THEN
      
      -- 3. Find all contents linked to this product
      FOR v_content_record IN 
        SELECT content_id 
        FROM product_contents 
        WHERE product_id = v_product_id
      LOOP
        -- 4. Insert access grant if not exists
        INSERT INTO access_grants (user_id, content_id, product_id, granted_at, status)
        VALUES (v_user_id, v_content_record.content_id, v_product_id, NOW(), 'active')
        ON CONFLICT (user_id, content_id) 
        DO UPDATE SET status = 'active', granted_at = NOW();
        
      END LOOP;
      
      -- Also grant access to the product itself
      INSERT INTO access_grants (user_id, product_id, granted_at, status)
      VALUES (v_user_id, v_product_id, NOW(), 'active')
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET status = 'active', granted_at = NOW();

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_paid_grant_access ON orders;
CREATE TRIGGER on_order_paid_grant_access
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_order_access();

-- 3.2. Get Member Area Members View
create or replace function get_member_area_members(area_id uuid)
returns table (
  user_id uuid,
  email text,
  name text,
  joined_at timestamptz,
  status text
)
security definer
as $$
begin
  return query
  select distinct
    u.id as user_id,
    u.email::text,
    coalesce((u.raw_user_meta_data->>'name')::text, 'Sem nome') as name,
    min(ag.granted_at) as joined_at,
    ag.status::text
  from access_grants ag
  join auth.users u on ag.user_id = u.id
  join contents c on ag.content_id = c.id
  where c.member_area_id = area_id
  group by u.id, u.email, u.raw_user_meta_data, ag.status;
end;
$$ language plpgsql;

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;

-- 4.1. Member Areas
CREATE POLICY "Users can view their own member areas" ON member_areas FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own member areas" ON member_areas FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own member areas" ON member_areas FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own member areas" ON member_areas FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Public can view member areas by slug" ON member_areas FOR SELECT USING (true);

-- 4.2. Products
CREATE POLICY "Users can manage their own products" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (active = true);

-- 4.3. Contents
CREATE POLICY "Users can manage their own contents" ON contents FOR ALL USING (
  EXISTS (SELECT 1 FROM member_areas ma WHERE ma.id = contents.member_area_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published contents" ON contents FOR SELECT USING (is_published = true);

-- 4.4. Modules
CREATE POLICY "Users can manage their own modules" ON modules FOR ALL USING (
  EXISTS (SELECT 1 FROM contents c JOIN member_areas ma ON ma.id = c.member_area_id WHERE c.id = modules.content_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published modules" ON modules FOR SELECT USING (is_published = true);

-- 4.5. Lessons
CREATE POLICY "Users can manage their own lessons" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM modules m JOIN contents c ON c.id = m.content_id JOIN member_areas ma ON ma.id = c.member_area_id WHERE m.id = lessons.module_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published lessons" ON lessons FOR SELECT USING (is_published = true);

-- 4.6. Tracks
CREATE POLICY "Admins can manage tracks" ON tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM member_areas ma WHERE ma.id = tracks.member_area_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view visible tracks" ON tracks FOR SELECT USING (is_visible = true);

-- 4.7. Track Items
CREATE POLICY "Admins can manage track items" ON track_items FOR ALL USING (
  EXISTS (SELECT 1 FROM tracks JOIN member_areas ma ON ma.id = tracks.member_area_id WHERE tracks.id = track_items.track_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view track items" ON track_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM tracks WHERE tracks.id = track_items.track_id AND tracks.is_visible = true)
);

-- 4.8. Licenses (Admin Only)
CREATE POLICY "Admin can manage licenses" ON licenses USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4.9. Validation Logs
CREATE POLICY "Admin can view logs" ON validation_logs FOR SELECT USING (auth.role() = 'authenticated');

-- ==========================================
-- 5. STORAGE BUCKETS
-- ==========================================

-- Member Areas Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('member-areas', 'member-areas', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access Member Areas" ON storage.objects FOR SELECT USING ( bucket_id = 'member-areas' );
CREATE POLICY "Authenticated Upload Member Areas" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'member-areas' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Update Member Areas" ON storage.objects FOR UPDATE USING ( bucket_id = 'member-areas' AND auth.role() = 'authenticated' );

-- Contents Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('contents', 'contents', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access Contents" ON storage.objects FOR SELECT USING ( bucket_id = 'contents' );
CREATE POLICY "Authenticated Upload Contents" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'contents' AND auth.role() = 'authenticated' );
CREATE POLICY "Authenticated Update Contents" ON storage.objects FOR UPDATE USING ( bucket_id = 'contents' AND auth.role() = 'authenticated' );
\`;
