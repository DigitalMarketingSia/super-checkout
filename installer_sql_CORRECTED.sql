-- Super Checkout - Definitive Fail-Proof Schema
-- Run this in the Supabase SQL Editor. It is idempotent (safe to run multiple times).

-- ==========================================
-- 1. EXTENSIONS & CONFIGURATION
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 2. CORE TABLES (Idempotent Creation)
-- ==========================================

-- 2.1 Domains
CREATE TABLE IF NOT EXISTS domains(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending_verification',
    type TEXT DEFAULT 'cname',
    usage TEXT DEFAULT 'checkout',
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS usage TEXT DEFAULT 'checkout';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'cname';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS checkout_id UUID;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Column already exists in domains.';
END $$;

-- 2.2 Member Areas
CREATE TABLE IF NOT EXISTS member_areas(
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

DO $$
BEGIN
    ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);
    ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS favicon_url TEXT;
    ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#E50914';
    ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS banner_url TEXT;
    ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS login_image_url TEXT;
    ALTER TABLE member_areas ADD COLUMN IF NOT EXISTS allow_free_signup BOOLEAN DEFAULT TRUE;
END $$;

-- 2.3 Products
CREATE TABLE IF NOT EXISTS products(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_real DECIMAL(10, 2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_fake DECIMAL(10, 2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS redirect_link TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_order_bump BOOLEAN DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_upsell BOOLEAN DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS visible_in_member_area BOOLEAN DEFAULT true;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS for_sale BOOLEAN DEFAULT true;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_action TEXT DEFAULT 'none';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_checkout_id UUID;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';
END $$;

-- 2.4 Gateways (Essential for checkout)
CREATE TABLE IF NOT EXISTS gateways(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT,
    provider TEXT NOT NULL,
    credentials JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    public_key TEXT,
    private_key TEXT,
    webhook_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE gateways ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE gateways ADD COLUMN IF NOT EXISTS public_key TEXT;
    ALTER TABLE gateways ADD COLUMN IF NOT EXISTS private_key TEXT;
    ALTER TABLE gateways ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
END $$;

-- 2.5 Checkouts
CREATE TABLE IF NOT EXISTS checkouts(
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

DO $$
BEGIN
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS offer_id UUID;
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS gateway_id UUID REFERENCES gateways(id);
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS order_bump_ids JSONB;
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS upsell_product_id UUID;
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS custom_url_slug TEXT;
    ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS config JSONB;
END $$;

-- Fix FK for products AFTER checkouts exists
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'products_member_area_checkout_fk') THEN
        ALTER TABLE products
        ADD CONSTRAINT products_member_area_checkout_fk
        FOREIGN KEY(member_area_checkout_id)
        REFERENCES checkouts(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 2.6 Tracks (BEFORE contents because contents references member_areas)
CREATE TABLE IF NOT EXISTS tracks(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN('products', 'contents', 'modules', 'lessons')),
    position INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    card_style TEXT DEFAULT 'horizontal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 Contents (MUST BE BEFORE modules, lessons, product_contents, access_grants)
CREATE TABLE IF NOT EXISTS contents(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    type TEXT DEFAULT 'course',
    author_id UUID REFERENCES auth.users(id),
    position INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    is_free BOOLEAN DEFAULT false,
    card_style TEXT DEFAULT 'horizontal',
    modules_layout TEXT DEFAULT 'horizontal',
    image_vertical_url TEXT,
    image_horizontal_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 Modules (AFTER contents)
CREATE TABLE IF NOT EXISTS modules(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    image_vertical_url TEXT,
    image_horizontal_url TEXT,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS image_vertical_url TEXT;
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS image_horizontal_url TEXT;
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
END $$;

-- 2.9 Lessons (AFTER modules)
CREATE TABLE IF NOT EXISTS lessons(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT,
    video_url TEXT,
    content_text TEXT,
    file_url TEXT,
    order_index INTEGER DEFAULT 0,
    duration INTEGER,
    is_free BOOLEAN DEFAULT false,
    image_url TEXT,
    gallery JSONB,
    content_order JSONB DEFAULT '["video", "text", "file", "gallery"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration INTEGER;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_text TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS file_url TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS gallery JSONB;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_order JSONB DEFAULT '["video", "text", "file", "gallery"]'::jsonb;
END $$;

-- 2.10 Track Items (AFTER tracks)
CREATE TABLE IF NOT EXISTS track_items(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
    item_id UUID NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.11 Product Contents (AFTER products AND contents)
CREATE TABLE IF NOT EXISTS product_contents(
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY(product_id, content_id)
);

-- 2.12 Orders
CREATE TABLE IF NOT EXISTS orders(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checkout_id UUID REFERENCES checkouts(id),
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_document TEXT,
    total DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT,
    payment_id TEXT,
    metadata JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_id UUID;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2);
END $$;

-- 2.13 Payments
CREATE TABLE IF NOT EXISTS payments(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) NOT NULL,
    gateway_id UUID REFERENCES gateways(id) NOT NULL,
    status TEXT NOT NULL,
    transaction_id TEXT,
    raw_response JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.14 Access Grants (AFTER contents AND products)
CREATE TABLE IF NOT EXISTS access_grants(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_subscription BOOLEAN DEFAULT false,
    subscription_provider_id TEXT,
    subscription_status TEXT DEFAULT 'active',
    UNIQUE(user_id, content_id),
    UNIQUE(user_id, product_id)
);

DO $$
BEGIN
    ALTER TABLE access_grants ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;
    ALTER TABLE access_grants ADD COLUMN IF NOT EXISTS subscription_provider_id TEXT;
    ALTER TABLE access_grants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
END $$;

-- 2.15 Licenses (Installer logic)
CREATE TABLE IF NOT EXISTS licenses(
    key UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_email TEXT NOT NULL,
    client_name TEXT,
    status TEXT DEFAULT 'active',
    allowed_domain TEXT,
    plan TEXT DEFAULT 'lifetime',
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS validation_logs(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    license_key UUID REFERENCES licenses(key),
    ip_address TEXT,
    domain TEXT,
    user_agent TEXT,
    valid BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. MEMBER MANAGEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles(
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    role TEXT DEFAULT 'member',
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.member_notes(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.member_tags(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tag)
);

CREATE TABLE IF NOT EXISTS public.activity_logs(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integrations(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

-- ==========================================
-- 4. VIEWS & FUNCTIONS
-- ==========================================

-- 4.1 Admin Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS  AS 
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
 LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Handle New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS  AS 
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS(SELECT 1 FROM public.profiles) INTO is_first_user;

  INSERT INTO public.profiles(id, email, full_name, role)
  VALUES(
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    CASE 
      WHEN is_first_user THEN 'admin' 
      ELSE COALESCE(NEW.raw_user_meta_data ->> 'role', 'member') 
    END
  )
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Check if Setup is Required
CREATE OR REPLACE FUNCTION public.is_setup_required()
RETURNS  AS 
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  RETURN admin_count = 0;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_setup_required() TO anon;
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.4 Handle Order Access
CREATE OR REPLACE FUNCTION handle_new_order_access()
RETURNS  AS 
DECLARE
  v_product_id UUID;
  v_user_id UUID;
  v_content_record RECORD;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT product_id INTO v_product_id FROM checkouts WHERE id = NEW.checkout_id;
    SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.customer_email;

    IF v_product_id IS NOT NULL AND v_user_id IS NOT NULL THEN
      FOR v_content_record IN 
        SELECT content_id FROM product_contents WHERE product_id = v_product_id
      LOOP
        INSERT INTO access_grants(user_id, content_id, product_id, granted_at, status)
        VALUES(v_user_id, v_content_record.content_id, v_product_id, NOW(), 'active')
        ON CONFLICT(user_id, content_id) 
        DO UPDATE SET status = 'active', granted_at = NOW();
      END LOOP;
      
      INSERT INTO access_grants(user_id, product_id, granted_at, status)
      VALUES(v_user_id, v_product_id, NOW(), 'active')
      ON CONFLICT(user_id, product_id)
      DO UPDATE SET status = 'active', granted_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_paid_grant_access ON orders;
CREATE TRIGGER on_order_paid_grant_access
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_order_access();

-- 4.5 Get Member Area Members
CREATE OR REPLACE FUNCTION get_member_area_members(area_id uuid)
RETURNS TABLE(
    user_id uuid,
    email text,
    name text,
    joined_at timestamptz,
    status text
)
SECURITY DEFINER
AS 
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email::text,
    COALESCE((u.raw_user_meta_data ->> 'name')::text, 'Sem nome') as name,
    MIN(ag.granted_at) as joined_at,
    ag.status::text
  FROM access_grants ag
  JOIN auth.users u ON ag.user_id = u.id
  JOIN contents c ON ag.content_id = c.id
  WHERE c.member_area_id = area_id
  GROUP BY u.id, u.email, u.raw_user_meta_data, ag.status;
END;
 LANGUAGE plpgsql;

-- 4.6 Admin Members View
CREATE OR REPLACE VIEW public.admin_members_view AS 
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  p.status,
  p.last_seen_at,
  p.created_at as joined_at,
  (SELECT COUNT(*) FROM access_grants ag WHERE ag.user_id = p.id AND ag.status = 'active') as active_products_count,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_user_id = p.id) as orders_count
FROM public.profiles p;

-- ==========================================
-- 5. STORAGE & BUCKETS
-- ==========================================
INSERT INTO storage.buckets(id, name, public) VALUES('products', 'products', true) ON CONFLICT(id) DO NOTHING;
INSERT INTO storage.buckets(id, name, public) VALUES('checkouts', 'checkouts', true) ON CONFLICT(id) DO NOTHING;
INSERT INTO storage.buckets(id, name, public) VALUES('contents', 'contents', true) ON CONFLICT(id) DO NOTHING;
INSERT INTO storage.buckets(id, name, public) VALUES('avatars', 'avatars', true) ON CONFLICT(id) DO NOTHING;
INSERT INTO storage.buckets(id, name, public) VALUES('member-areas', 'member-areas', true) ON CONFLICT(id) DO NOTHING;

-- ==========================================
-- 6. RLS POLICIES (Security)
-- ==========================================
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
ALTER TABLE gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "' || r.tablename || '";';
  END LOOP;
END $$;

-- Domains
CREATE POLICY "Users can manage their own domains" ON domains FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "Public can view active domains" ON domains FOR SELECT USING(true);

-- Member Areas
CREATE POLICY "Users and public can view member areas" ON member_areas FOR SELECT USING(auth.uid() = owner_id OR true);
CREATE POLICY "Users can create member areas" ON member_areas FOR INSERT WITH CHECK(auth.uid() = owner_id);
CREATE POLICY "Users can update own member areas" ON member_areas FOR UPDATE USING(auth.uid() = owner_id);
CREATE POLICY "Users can delete own member areas" ON member_areas FOR DELETE USING(auth.uid() = owner_id);

-- Products
CREATE POLICY "Users can manage their own products" ON products FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "Public can view products" ON products FOR SELECT USING(true);

-- Gateways
CREATE POLICY "Users can manage their own gateways" ON gateways FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "Public can view active gateways" ON gateways FOR SELECT USING(active = true OR is_active = true);

-- Checkouts
CREATE POLICY "Users can manage their own checkouts" ON checkouts FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "Public can view active checkouts" ON checkouts FOR SELECT USING(active = true);

-- Orders
CREATE POLICY "Users can manage their own orders" ON orders FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "Customers can view their own orders" ON orders FOR SELECT USING(auth.uid() = customer_user_id);
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK(true);
CREATE POLICY "Public can view orders" ON orders FOR SELECT USING(true);

-- Payments
CREATE POLICY "Users can manage their own payments" ON payments FOR ALL USING(auth.uid() = user_id);
CREATE POLICY "Public can create payments" ON payments FOR INSERT WITH CHECK(true);
CREATE POLICY "Public can view payments" ON payments FOR SELECT USING(true);

-- Contents
CREATE POLICY "Users can manage their own contents" ON contents FOR ALL USING(
    EXISTS(SELECT 1 FROM member_areas ma WHERE ma.id = contents.member_area_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published contents" ON contents FOR SELECT USING(is_published = true);

-- Modules
CREATE POLICY "Users can manage their own modules" ON modules FOR ALL USING(
    EXISTS(SELECT 1 FROM contents c JOIN member_areas ma ON ma.id = c.member_area_id WHERE c.id = modules.content_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published modules" ON modules FOR SELECT USING(is_published = true);

-- Lessons
CREATE POLICY "Users can manage their own lessons" ON lessons FOR ALL USING(
    EXISTS(SELECT 1 FROM modules m JOIN contents c ON c.id = m.content_id JOIN member_areas ma ON ma.id = c.member_area_id WHERE m.id = lessons.module_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published lessons" ON lessons FOR SELECT USING(is_published = true);

-- Tracks
CREATE POLICY "Admins can manage tracks" ON tracks FOR ALL USING(
    EXISTS(SELECT 1 FROM member_areas ma WHERE ma.id = tracks.member_area_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view visible tracks" ON tracks FOR SELECT USING(is_visible = true);

-- Track Items
CREATE POLICY "Admins can manage track items" ON track_items FOR ALL USING(
    EXISTS(SELECT 1 FROM tracks JOIN member_areas ma ON ma.id = tracks.member_area_id WHERE tracks.id = track_items.track_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view track items" ON track_items FOR SELECT USING(
    EXISTS(SELECT 1 FROM tracks WHERE tracks.id = track_items.track_id AND tracks.is_visible = true)
);

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING(auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING(auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING(public.is_admin());

-- Config Tables
CREATE POLICY "Admins can manage member notes" ON public.member_notes FOR ALL USING(EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage member tags" ON public.member_tags FOR ALL USING(EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Logs
CREATE POLICY "Users can create their own logs" ON public.activity_logs FOR INSERT WITH CHECK(auth.uid() = user_id);
CREATE POLICY "Users can view their own logs" ON public.activity_logs FOR SELECT USING(auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON public.activity_logs FOR SELECT USING(EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can manage their own integrations" ON public.integrations FOR ALL USING(auth.uid() = user_id);

-- Licenses
CREATE POLICY "Admin can manage licenses" ON licenses USING(auth.role() = 'authenticated') WITH CHECK(auth.role() = 'authenticated');
CREATE POLICY "Admin can view validation logs" ON validation_logs FOR SELECT USING(auth.role() = 'authenticated');

-- Product Contents
CREATE POLICY "Users can manage product contents" ON product_contents FOR ALL USING(
    EXISTS(SELECT 1 FROM products p WHERE p.id = product_contents.product_id AND p.user_id = auth.uid())
);
CREATE POLICY "Public can view product contents" ON product_contents FOR SELECT USING(true);

-- Access Grants
CREATE POLICY "Users can view their own access grants" ON access_grants FOR SELECT USING(auth.uid() = user_id);
CREATE POLICY "Admins can manage access grants" ON access_grants FOR ALL USING(
    EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ==========================================
-- 7. STORAGE POLICIES
-- ==========================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access Member Areas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Member Areas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Member Areas" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Contents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Contents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Contents" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Checkouts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Checkouts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Checkouts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Checkouts" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Products" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Avatars" ON storage.objects;

-- Re-create Storage Policies
CREATE POLICY "Public Access Member Areas" ON storage.objects FOR SELECT USING(bucket_id = 'member-areas');
CREATE POLICY "Authenticated Upload Member Areas" ON storage.objects FOR INSERT WITH CHECK(bucket_id = 'member-areas' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Member Areas" ON storage.objects FOR UPDATE USING(bucket_id = 'member-areas' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Contents" ON storage.objects FOR SELECT USING(bucket_id = 'contents');
CREATE POLICY "Authenticated Upload Contents" ON storage.objects FOR INSERT WITH CHECK(bucket_id = 'contents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Contents" ON storage.objects FOR UPDATE USING(bucket_id = 'contents' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Checkouts" ON storage.objects FOR SELECT USING(bucket_id = 'checkouts');
CREATE POLICY "Authenticated Upload Checkouts" ON storage.objects FOR INSERT WITH CHECK(bucket_id = 'checkouts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Checkouts" ON storage.objects FOR UPDATE USING(bucket_id = 'checkouts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Checkouts" ON storage.objects FOR DELETE USING(bucket_id = 'checkouts' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING(bucket_id = 'products');
CREATE POLICY "Authenticated Upload Products" ON storage.objects FOR INSERT WITH CHECK(bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Products" ON storage.objects FOR UPDATE USING(bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Products" ON storage.objects FOR DELETE USING(bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING(bucket_id = 'avatars');
CREATE POLICY "Authenticated Upload Avatars" ON storage.objects FOR INSERT WITH CHECK(bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ==========================================
-- 8. CACHE RELOAD (Critical for API to see new columns immediately)
-- ==========================================
NOTIFY pgrst, 'reload schema';
