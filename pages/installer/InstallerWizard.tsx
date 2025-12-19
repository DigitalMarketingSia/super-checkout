import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Database, Key, Server, AlertCircle, ExternalLink, Github, Globe, Copy, Info, X, ShieldCheck, Mail, Settings } from 'lucide-react';
import { AlertModal } from '../../components/ui/Modal';

const SQL_SCHEMA = `-- Super Checkout - Definitive Fail-Proof Schema
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
CREATE TABLE IF NOT EXISTS domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending_verification',
  usage TEXT DEFAULT 'checkout',
  checkout_id UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist (for updates)
DO $$
BEGIN
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS usage TEXT DEFAULT 'checkout';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS checkout_id UUID;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Column already exists in domains.';
END $$;

-- 2.2 Member Areas
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

DO $$
BEGIN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_real DECIMAL(10,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_fake DECIMAL(10,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS redirect_link TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_order_bump BOOLEAN DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_upsell BOOLEAN DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS visible_in_member_area BOOLEAN DEFAULT true;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS for_sale BOOLEAN DEFAULT true;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_action TEXT DEFAULT 'none';
    -- FK to checkouts moved to after checkouts table creation
    -- ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_checkout_id UUID REFERENCES checkouts(id);
END $$;

-- 2.4 Contents
CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  image_vertical_url TEXT,
  image_horizontal_url TEXT,
  modules_layout TEXT DEFAULT 'horizontal',
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS image_vertical_url TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS image_horizontal_url TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS modules_layout TEXT DEFAULT 'horizontal';
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
END $$;

-- 2.5 Modules
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

DO $$
BEGIN
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS image_vertical_url TEXT;
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS image_horizontal_url TEXT;
END $$;

-- 2.6 Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration INTEGER;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS image_url TEXT;
END $$;

-- 2.7 Product Contents
CREATE TABLE IF NOT EXISTS product_contents (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (product_id, content_id)
);

-- 2.8 Gateways (Essential for checkout)
CREATE TABLE IF NOT EXISTS gateways (
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

-- 2.9 Checkouts
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
    ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_checkout_id UUID; 
    
    -- Add constraint only if it doesn't exist to avoid errors
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_member_area_checkout_fk') THEN
        ALTER TABLE products
        ADD CONSTRAINT products_member_area_checkout_fk
        FOREIGN KEY (member_area_checkout_id)
        REFERENCES checkouts(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 2.10 Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_id UUID REFERENCES checkouts(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT,
  payment_id TEXT,
  metadata JSONB,
  items JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    -- CRITICAL FIX: Ensure both user_id (seller) and customer_user_id (buyer) exist
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_id UUID;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
    -- Removed duplicates (total, payment_method, etc. are already in CREATE TABLE)
END $$;

-- 2.11 Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) NOT NULL,
  gateway_id UUID REFERENCES gateways(id) NOT NULL,
  status TEXT NOT NULL,
  transaction_id TEXT,
  raw_response JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 Access Grants
CREATE TABLE IF NOT EXISTS access_grants (
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

-- 2.12 Tracks & Items
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID REFERENCES member_areas(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('products', 'contents', 'modules', 'lessons')),
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  card_style TEXT DEFAULT 'horizontal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS track_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  item_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.13 Licenses (Installer logic)
CREATE TABLE IF NOT EXISTS licenses (
  key UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_name TEXT,
  status TEXT DEFAULT 'active',
  allowed_domain TEXT,
  plan TEXT DEFAULT 'lifetime',
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
-- 3. MEMBER MANAGEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.member_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.member_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tag)
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.integrations (
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

-- 4.1. Admin Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2. Handle New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Count existing admins to decide if this new user should be admin
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE 
      WHEN admin_count = 0 THEN 'admin' 
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'member') 
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2.1 Check if Setup is Required (No Admins)
CREATE OR REPLACE FUNCTION public.is_setup_required()
RETURNS BOOLEAN AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  RETURN admin_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to allow unauthenticated access (fixes CORS/fetch error on setup)
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO anon;
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.3. Handle Order Access
CREATE OR REPLACE FUNCTION handle_new_order_access()
RETURNS TRIGGER AS $$
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
        INSERT INTO access_grants (user_id, content_id, product_id, granted_at, status)
        VALUES (v_user_id, v_content_record.content_id, v_product_id, NOW(), 'active')
        ON CONFLICT (user_id, content_id) 
        DO UPDATE SET status = 'active', granted_at = NOW();
      END LOOP;
      
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

-- 4.4 Get Member Area Members
CREATE OR REPLACE FUNCTION get_member_area_members(area_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  name text,
  joined_at timestamptz,
  status text
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email::text,
    COALESCE((u.raw_user_meta_data->>'name')::text, 'Sem nome') as name,
    MIN(ag.granted_at) as joined_at,
    ag.status::text
  FROM access_grants ag
  JOIN auth.users u ON ag.user_id = u.id
  JOIN contents c ON ag.content_id = c.id
  WHERE c.member_area_id = area_id
  GROUP BY u.id, u.email, u.raw_user_meta_data, ag.status;
END;
$$ LANGUAGE plpgsql;

-- 4.5 Admin Members View (Fixing the error source)
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
-- 5. RLS POLICIES (Re-apply safely)
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
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts (safest approach for installer)
-- Drop only relevant policies to avoid dangerous global drops
DO $$
BEGIN
  -- Domains
  DROP POLICY IF EXISTS "Users can manage their own domains" ON domains;
  DROP POLICY IF EXISTS "Public can view active domains" ON domains;
  
  -- Member Areas
  DROP POLICY IF EXISTS "Users can view their own member areas" ON member_areas;
  DROP POLICY IF EXISTS "Users can insert their own member areas" ON member_areas;
  DROP POLICY IF EXISTS "Users can update their own member areas" ON member_areas;
  DROP POLICY IF EXISTS "Users can delete their own member areas" ON member_areas;
  DROP POLICY IF EXISTS "Public can view member areas by slug" ON member_areas;
  
  -- Products
  DROP POLICY IF EXISTS "Users can manage their own products" ON products;
  DROP POLICY IF EXISTS "Public can view active products" ON products;
  
  -- Checkouts
  DROP POLICY IF EXISTS "Users can manage their own checkouts" ON checkouts;
  DROP POLICY IF EXISTS "Public can view active checkouts" ON checkouts;
  
  -- Orders
  DROP POLICY IF EXISTS "Users can manage their own orders" ON orders;
  DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
  DROP POLICY IF EXISTS "Public can create orders" ON orders;
  DROP POLICY IF EXISTS "Public can view orders" ON orders;
  DROP POLICY IF EXISTS "Seller can manage own orders" ON orders;
  DROP POLICY IF EXISTS "Customer can view own orders" ON orders;

  -- Licenses
  DROP POLICY IF EXISTS "Admin can manage licenses" ON licenses;
  DROP POLICY IF EXISTS "Admins can manage licenses" ON licenses;
END $$;

-- 5.1 Basic Owner Policies
-- Domains
CREATE POLICY "Users can manage their own domains" ON domains FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active domains" ON domains FOR SELECT USING (true);

-- Member Areas
CREATE POLICY "Users can view their own member areas" ON member_areas FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own member areas" ON member_areas FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own member areas" ON member_areas FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own member areas" ON member_areas FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Public can view member areas by slug" ON member_areas FOR SELECT USING (true);

-- Products
CREATE POLICY "Users can manage their own products" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (active = true);

-- Gateways
CREATE POLICY "Users can manage their own gateways" ON gateways FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active gateways" ON gateways FOR SELECT USING (active = true OR is_active = true);

-- Checkouts
CREATE POLICY "Users can manage their own checkouts" ON checkouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active checkouts" ON checkouts FOR SELECT USING (active = true);

-- Orders
CREATE POLICY "Seller can manage own orders" ON orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Customer can view own orders" ON orders FOR SELECT USING (auth.uid() = customer_user_id);
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
-- REMOVED: Public can view orders (Security Risk)

-- Payments
CREATE POLICY "Users can manage their own payments" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can create payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view payments" ON payments FOR SELECT USING (true);


-- Contents
CREATE POLICY "Users can manage their own contents" ON contents FOR ALL USING (
  EXISTS (SELECT 1 FROM member_areas ma WHERE ma.id = contents.member_area_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published contents" ON contents FOR SELECT USING (is_published = true);

-- Modules
CREATE POLICY "Users can manage their own modules" ON modules FOR ALL USING (
  EXISTS (SELECT 1 FROM contents c JOIN member_areas ma ON ma.id = c.member_area_id WHERE c.id = modules.content_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published modules" ON modules FOR SELECT USING (is_published = true);

-- Lessons
CREATE POLICY "Users can manage their own lessons" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM modules m JOIN contents c ON c.id = m.content_id JOIN member_areas ma ON ma.id = c.member_area_id WHERE m.id = lessons.module_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view published lessons" ON lessons FOR SELECT USING (is_published = true);

-- Tracks
CREATE POLICY "Admins can manage tracks" ON tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM member_areas ma WHERE ma.id = tracks.member_area_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view visible tracks" ON tracks FOR SELECT USING (is_visible = true);

-- Track Items
CREATE POLICY "Admins can manage track items" ON track_items FOR ALL USING (
  EXISTS (SELECT 1 FROM tracks JOIN member_areas ma ON ma.id = tracks.member_area_id WHERE tracks.id = track_items.track_id AND ma.owner_id = auth.uid())
);
CREATE POLICY "Public can view track items" ON track_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM tracks WHERE tracks.id = track_items.track_id AND tracks.is_visible = true)
);

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Config Tables
CREATE POLICY "Admins can manage member notes" ON public.member_notes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage member tags" ON public.member_tags FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Logs
CREATE POLICY "Users can create their own logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON public.activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));



CREATE POLICY "Users can manage their own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);

-- Licenses
CREATE POLICY "Admins can manage licenses" ON licenses FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can view validation logs" ON validation_logs FOR SELECT USING (public.is_admin());

-- ==========================================
-- 6. STORAGE BUCKETS (Idempotent)
-- ==========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('member-areas', 'member-areas', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('contents', 'contents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('checkouts', 'checkouts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Drop first to ensure clean state)
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

-- Re-create Storage Policies
CREATE POLICY "Public Access Member Areas" ON storage.objects FOR SELECT USING (bucket_id = 'member-areas');
CREATE POLICY "Authenticated Upload Member Areas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'member-areas' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Member Areas" ON storage.objects FOR UPDATE USING (bucket_id = 'member-areas' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Contents" ON storage.objects FOR SELECT USING (bucket_id = 'contents');
CREATE POLICY "Authenticated Upload Contents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Contents" ON storage.objects FOR UPDATE USING (bucket_id = 'contents' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Checkouts" ON storage.objects FOR SELECT USING (bucket_id = 'checkouts');
CREATE POLICY "Authenticated Upload Checkouts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checkouts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Checkouts" ON storage.objects FOR UPDATE USING (bucket_id = 'checkouts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Checkouts" ON storage.objects FOR DELETE USING (bucket_id = 'checkouts' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Authenticated Upload Products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Products" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Products" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');`;

// Define the steps for the guided flow
type Step = 'license' | 'supabase' | 'supabase_migrations' | 'supabase_keys' | 'deploy' | 'success' | 'check_subscription' | 'supabase_setup' | 'vercel_config';

export default function InstallerWizard() {
    const [currentStep, setCurrentStep] = useState<Step>('check_subscription');
    const [logs, setLogs] = useState<string[]>([]);
    const [licenseKey, setLicenseKey] = useState('');
    const [organizationSlug, setOrganizationSlug] = useState('');

    // New States
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Supabase config
    const [supabaseMode, setSupabaseMode] = useState<'auto' | 'manual'>('auto');
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [serviceKey, setServiceKey] = useState('');

    // Vercel config
    const [vercelDomain, setVercelDomain] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [vercelProjectId, setVercelProjectId] = useState('');
    const [vercelTeamId, setVercelTeamId] = useState('');

    const [showSqlModal, setShowSqlModal] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', variant: 'success' as const });

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const showAlert = (title: string, message: string, variant: 'success' | 'error' = 'success') => {
        setAlertModal({ isOpen: true, title, message, variant });
    };

    const copyToClipboard = (text: string, id?: string) => {
        navigator.clipboard.writeText(text);
        addLog('Copiado para a área de transferência!');
        if (id) {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            // Fallback for generic copy
            setCopiedId('generic');
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    // --- LOGIC: License ---
    const handleLicenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Use licenseKey for validation
        const checkValue = licenseKey;



        try {
            const response = await fetch('/api/licenses/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: checkValue, domain: window.location.hostname })
            });

            if (!response.ok) {
                const status = response.status;
                let errorMsg = `Erro no Servidor(${status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {
                    console.error('Non-JSON response:', e);
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.valid) {
                addLog('Licença validada com sucesso!');
                setTimeout(() => {
                    setLoading(false);
                    setCurrentStep('supabase_setup');
                    if (currentStep === 'license') {
                        localStorage.setItem('installer_license_key', licenseKey);
                    }
                }, 1000);
            } else {
                throw new Error(data.message || 'Licença inválida');
            }

        } catch (error: any) {
            console.error(error);
            addLog(`Erro: ${error.message}`);
            showAlert('Erro de Licença', error.message, 'error');
            setLoading(false);
        }
    };



    // --- LOGIC: Supabase Setup ---
    // --- LOGIC: Supabase Automatic ---
    const handleSupabaseAutoConnect = () => {
        setLoading(true);
        const clientId = import.meta.env.VITE_SUPABASE_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID || 'mock_client_id';
        const redirectUri = `${window.location.origin}/installer`;
        const stateObj = { step: 'supabase', key: licenseKey };
        const state = btoa(JSON.stringify(stateObj));
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'projects:read projects:write secrets:read secrets:write organizations:read',
            state: state
        });
        window.location.href = `https://api.supabase.com/v1/oauth/authorize?${params.toString()}`;
    };

    // --- LOGIC: Supabase Manual ---
    const handleSupabaseManualSubmit = () => {
        if (!supabaseUrl) return setError('URL é obrigatória');
        setCurrentStep('supabase_migrations');
    };

    const handleSupabaseCallback = async (code: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/installer/supabase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_project',
                    code,
                    licenseKey: licenseKey || localStorage.getItem('installer_license_key'),
                    organizationSlug: organizationSlug || localStorage.getItem('installer_org_slug')
                })
            });

            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const textError = await res.text();
                throw new Error(`Erro na API (${res.status}): ${textError.substring(0, 200)}`);
            }
            if (!res.ok) throw new Error(data.error || 'Falha ao criar projeto Supabase');

            const url = `https://${data.projectRef}.supabase.co`;
            setSupabaseUrl(url);
            localStorage.setItem('installer_supabase_url', url);
            localStorage.setItem('installer_supabase_ref', data.projectRef);
            localStorage.setItem('installer_supabase_dbpass', data.dbPass);

            addLog('✅ Projeto Supabase criado com sucesso!');
            setCurrentStep('supabase_migrations'); // Go to migrations
        } catch (error: any) {
            console.error(error);
            addLog(`Erro: ${error.message}`);
            showAlert('Erro Supabase', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleKeysSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!anonKey || !serviceKey) {
            showAlert('Campos Obrigatórios', 'Por favor, preencha ambas as chaves.', 'error');
            return;
        }
        localStorage.setItem('installer_supabase_anon_key', anonKey);
        localStorage.setItem('installer_supabase_service_key', serviceKey);

        addLog('Chaves de API salvas com sucesso!');
        setCurrentStep('deploy'); // Go to Deploy Step
    };

    // --- LOGIC: Deploy (New Unified Step) ---
    const handleDeploySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!vercelDomain) {
            showAlert('Campo Obrigatório', 'Por favor, cole o domínio (URL) do seu projeto na Vercel.', 'error');
            return;
        }
        let cleanDomain = vercelDomain.replace('https://', '').replace('http://', '').split('/')[0];
        localStorage.setItem('installer_vercel_domain', cleanDomain);
        setCurrentStep('success');
    }

    // --- EFFECTS ---
    useEffect(() => {
        if (licenseKey) localStorage.setItem('installer_license_key', licenseKey);
        if (organizationSlug) localStorage.setItem('installer_org_slug', organizationSlug);
        if (currentStep) localStorage.setItem('installer_step', currentStep);
    }, [licenseKey, organizationSlug, currentStep]);

    useEffect(() => {
        const savedKey = localStorage.getItem('installer_license_key');
        if (savedKey) setLicenseKey(savedKey);

        // Restore keys if available
        setAnonKey(localStorage.getItem('installer_supabase_anon_key') || '');
        setServiceKey(localStorage.getItem('installer_supabase_service_key') || '');
        setSupabaseUrl(localStorage.getItem('installer_supabase_url') || '');

        const savedStep = localStorage.getItem('installer_step') as Step;
        if (savedStep && savedStep !== 'success') {
            if (savedStep === 'license') {
                setCurrentStep('check_subscription');
            } else {
                setCurrentStep(savedStep);
            }
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const stateRaw = params.get('state');

        if (code && stateRaw) {
            try {
                const stateObj = JSON.parse(atob(stateRaw));
                if (stateObj.key) setLicenseKey(stateObj.key);
                window.history.replaceState({}, '', '/installer');
                if (stateObj.step === 'supabase') handleSupabaseCallback(code);
            } catch (e) {
                // Ignore errors
            }
        }
    }, []);

    // Helper to get step number
    const getStepStatus = (step: Step, position: number) => {
        // Updated flow: license -> supabase -> deploy -> success
        const stepsOrder = ['license', 'supabase', 'deploy', 'success'];
        const currentIndex = stepsOrder.indexOf(currentStep === 'supabase_migrations' || currentStep === 'supabase_keys' ? 'supabase' : currentStep);
        if (currentIndex > position) return 'completed';
        if (currentIndex === position) return 'active';
        return 'pending';
    };

    const deployUrl = `https://vercel.com/new/clone?repository-url=https://github.com/DigitalMarketingSia/super-checkout&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Configuracao%20Super%20Checkout&project-name=super-checkout&repository-name=super-checkout`;

    // Navigation Helper
    const stepsOrder = ['check_subscription', 'supabase_setup', 'supabase_migrations', 'supabase_keys', 'deploy', 'vercel_config', 'success'];
    const currentStepIndex = stepsOrder.indexOf(currentStep);

    const goBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(stepsOrder[currentStepIndex - 1] as any);
        }
    };

    const goNext = () => {
        if (currentStepIndex < stepsOrder.length - 1) {
            setCurrentStep(stepsOrder[currentStepIndex + 1] as any);
        }
    };

    return (

        <div className="min-h-screen bg-[#05050A] text-white selection:bg-primary/30 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#3ECF8E]/10 rounded-full blur-[128px] pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-screen" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px] pointer-events-none translate-x-1/2 translate-y-1/2 mix-blend-screen" />


            <div className="container mx-auto px-4 py-12 relative z-10 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                        <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/48'} />
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                        Instalação Super Checkout
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Configure seu sistema de pagamentos em poucos minutos.
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="max-w-xl mx-auto mb-16 relative">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                            className="h-full bg-gradient-to-r from-[#3ECF8E] to-emerald-400 transition-all duration-700 ease-out relative"
                            style={{ width: `${((currentStepIndex) / (stepsOrder.length - 1)) * 100}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        </div>
                    </div>
                    <div className="flex justify-between mt-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span>Licença</span>
                        <span>Banco de Dados</span>
                        <span>Configuração</span>
                        <span>Conclusão</span>
                    </div>
                </div>

                {/* Step Content */}
                <div className="max-w-2xl mx-auto">

                    {/* --- STEP 1: LICENSE CHECK --- */}
                    {currentStep === 'check_subscription' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Validar Licença</h1>
                            <p className="text-gray-400 mb-6">Digite sua chave de licença para validar o uso.</p>

                            <form onSubmit={handleLicenseSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Chave da Licença</label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="text"
                                            value={licenseKey}
                                            onChange={(e) => setLicenseKey(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-white/30 focus:ring-1 focus:ring-white/30 outline-none transition-all font-mono"
                                            placeholder="XXXX-XXXX-XXXX-XXXX"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 mt-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        <>
                                            Continuar <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* --- STEP 2: SUPABASE SETUP --- */}
                    {currentStep === 'supabase_setup' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Database className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Criar Banco de Dados</h1>
                            <p className="text-gray-400 mb-6">Escolha como deseja conectar seu Supabase.</p>

                            {/* Tabs */}
                            <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/10">
                                <button
                                    onClick={() => setSupabaseMode('auto')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${supabaseMode === 'auto' ? 'bg-[#3ECF8E] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Automático
                                </button>
                                <button
                                    onClick={() => setSupabaseMode('manual')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${supabaseMode === 'manual' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Manual
                                </button>
                            </div>

                            {supabaseMode === 'auto' ? (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="p-4 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded-xl">
                                        <p className="text-sm text-[#3ECF8E] mb-2 font-bold">Recomendado</p>
                                        <p className="text-sm text-gray-300">
                                            Vamos criar o projeto e configurar tudo para você automaticamente.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleSupabaseAutoConnect}
                                        disabled={loading}
                                        className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3ECF8E]/20"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Conectando...
                                            </>
                                        ) : (
                                            <>
                                                Conectar com Supabase <ExternalLink className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in">
                                    <a
                                        href="https://database.new"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-4 bg-black/40 border border-white/10 rounded-xl hover:border-[#3ECF8E]/50 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-white group-hover:text-[#3ECF8E] transition-colors">1. Criar Projeto Supabase</span>
                                            <ExternalLink className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <p className="text-sm text-gray-400">Clique para abrir o Supabase e criar um novo projeto.</p>
                                    </a>

                                    <div className="p-4 bg-black/40 border border-white/10 rounded-xl">
                                        <p className="text-sm font-medium text-gray-300 mb-3">2. Cole a URL do Projeto:</p>
                                        <input
                                            type="text"
                                            value={supabaseUrl}
                                            onChange={(e) => setSupabaseUrl(e.target.value)}
                                            placeholder="https://xxx.supabase.co"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Encontre em: Settings {'>'} API {'>'} Project URL
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleSupabaseManualSubmit}
                                        className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Database className="w-5 h-5" />
                                        Continuar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- STEP 2.5: MIGRATIONS --- */}
                    {currentStep === 'supabase_migrations' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Database className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Criar Tabelas</h1>
                            <p className="text-gray-400 mb-6">Execute o script SQL para estruturar seu banco.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setShowSqlModal(true)}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
                                >
                                    <Copy className="w-4 h-4" />
                                    Ver e Copiar SQL
                                </button>

                                <div className="text-center text-sm text-gray-500">
                                    Cole no SQL Editor do Supabase e execute.
                                </div>

                                <button
                                    onClick={() => setCurrentStep('supabase_keys')}
                                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    Já executei o SQL <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2.75: KEYS --- */}
                    {currentStep === 'supabase_keys' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Key className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Chaves de Acesso</h1>
                            <p className="text-gray-400 mb-6">Copie as chaves do Supabase em Project Settings {'>'} API.</p>

                            <form onSubmit={(e) => { e.preventDefault(); setCurrentStep('deploy'); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Anon Public Key</label>
                                    <input type="text" value={anonKey} onChange={e => setAnonKey(e.target.value)} required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Service Role Key (Secret)</label>
                                    <input type="text" value={serviceKey} onChange={e => setServiceKey(e.target.value)} required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono" />
                                </div>
                                <button type="submit" className="w-full bg-[#3ECF8E] text-black font-bold py-3 rounded-xl mt-2 hover:bg-[#3ECF8E]/90 flex justify-center items-center gap-2">
                                    Salvar e Continuar <ChevronRight className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* --- STEP 3: DEPLOY --- */}
                    {currentStep === 'deploy' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Publicar na Vercel</h1>
                            <p className="text-gray-400 mb-6">
                                Crie seu site automaticamente na Vercel.
                            </p>

                            <div className="space-y-6">
                                <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                                    <p className="text-sm text-gray-300 mb-4 font-bold">
                                        1. Copie e cole estas chaves ao fazer o deploy:
                                    </p>
                                    <div className="bg-black/50 rounded-xl p-4 border border-white/10 space-y-3 mb-6">
                                        {[
                                            { k: 'NEXT_PUBLIC_SUPABASE_URL', v: supabaseUrl },
                                            { k: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', v: anonKey },
                                            { k: 'SUPABASE_SERVICE_ROLE_KEY', v: serviceKey }
                                        ].map((env, i) => (
                                            <div key={i} className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/10" onClick={() => copyToClipboard(env.v, env.k)}>
                                                <div className="overflow-hidden flex-1">
                                                    <div className="text-xs text-gray-400 font-mono mb-1">{env.k}</div>
                                                    <div className="text-xs text-green-400 font-mono truncate">{env.v || '...'}</div>
                                                </div>
                                                <Copy className="w-4 h-4 text-gray-500" />
                                            </div>
                                        ))}
                                    </div>

                                    <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                                        className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-xl shadow-white/10 group"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 1155 1000" fill="black"><path d="M577.344 0L1154.69 1000H0L577.344 0Z" /></svg>
                                        Deploy to Vercel
                                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </a>
                                </div>

                                <button onClick={() => setCurrentStep('vercel_config')} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                    Já fiz o Deploy, quero configurar <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 4: VERCEL CONFIG (NEW) --- */}
                    {currentStep === 'vercel_config' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 text-purple-400 shadow-lg shadow-purple-500/10">
                                <Settings className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Configuração Pós-Deploy</h1>
                            <p className="text-gray-400 mb-6">Adicione estas variáveis na Vercel para ativar os domínios.</p>

                            <div className="mb-6 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                <img src="/vercel-env-info.png" alt="Onde encontrar as variáveis na Vercel" className="w-full h-auto object-cover" />
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Token */}
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-white font-bold text-sm">1. Token de Acesso</h3>
                                                <p className="text-xs text-gray-400">Settings {'>'} Tokens</p>
                                            </div>
                                            <button onClick={() => copyToClipboard('VERCEL_TOKEN')} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white flex gap-1 items-center transition-all">
                                                {copiedId === 'VERCEL_TOKEN' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                {copiedId === 'VERCEL_TOKEN' ? 'Copiado!' : 'Copiar Nome'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-black/60 rounded border border-white/5">
                                            <code className="text-xs text-purple-400 font-mono flex-1">VERCEL_TOKEN</code>
                                        </div>
                                        <a href="https://vercel.com/account/settings/tokens" target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                            Gerar Token Aqui <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>

                                    {/* Project ID */}
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-white font-bold text-sm">2. ID do Projeto</h3>
                                                <p className="text-xs text-gray-400">Project Settings {'>'} General</p>
                                            </div>
                                            <button onClick={() => copyToClipboard('VERCEL_PROJECT_ID')} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white flex gap-1 items-center transition-all">
                                                {copiedId === 'VERCEL_PROJECT_ID' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                {copiedId === 'VERCEL_PROJECT_ID' ? 'Copiado!' : 'Copiar Nome'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-black/60 rounded border border-white/5">
                                            <code className="text-xs text-purple-400 font-mono flex-1">VERCEL_PROJECT_ID</code>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                    <p className="text-xs text-yellow-500">
                                        <strong>⚠️ Importante:</strong> Adicione estas variáveis e faça um <strong>Redeploy</strong> na Vercel para aplicar.
                                    </p>
                                </div>

                                <form onSubmit={handleDeploySubmit} className="pt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                        URL do seu site (sem https://)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={vercelDomain}
                                            onChange={e => setVercelDomain(e.target.value)}
                                            placeholder="minha-loja.vercel.app"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none"
                                            required
                                        />
                                        <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-6 rounded-xl font-bold">
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}


                    {/* --- STEP 5: SUCCESS --- */}
                    {currentStep === 'success' && (
                        <div className="glass-panel border border-green-500/20 bg-green-500/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-lg shadow-green-500/20 mx-auto animate-in zoom-in duration-300">
                                <Check className="w-10 h-10" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4 text-white">Instalação Concluída!</h1>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Parabéns! Seu Super Checkout está configurado.
                            </p>

                            <div className="bg-black/40 rounded-xl p-6 mb-6 border border-white/5 text-center">
                                <p className="text-sm text-gray-400 mb-2">Painel Administrativo:</p>
                                <a
                                    href={`https://${localStorage.getItem('installer_vercel_domain') || vercelDomain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xl font-bold text-primary hover:underline font-mono"
                                >
                                    {localStorage.getItem('installer_vercel_domain') || vercelDomain}
                                </a>
                            </div>

                            <a
                                href={`https://${localStorage.getItem('installer_vercel_domain') || vercelDomain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1"
                            >
                                Acessar meu Sistema
                                <ChevronRight className="w-5 h-5" />
                            </a>
                        </div>
                    )}


                </div>
            </div>


            {/* --- SQL MODAL --- */}
            {
                showSqlModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="w-full max-w-4xl bg-[#0F0F13] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Database className="w-5 h-5 text-primary" />
                                    SQL de Migração (Supabase)
                                </h2>
                                <button
                                    onClick={() => setShowSqlModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto p-6 bg-black/40">
                                <div className="relative">
                                    <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
                                        {SQL_SCHEMA}
                                    </pre>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0F0F13] rounded-b-2xl">
                                <button
                                    onClick={() => setShowSqlModal(false)}
                                    className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={() => copyToClipboard(SQL_SCHEMA, 'sql_modal')}
                                    className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all ${copiedId === 'sql_modal'
                                        ? 'bg-green-500 text-white shadow-green-500/20 scale-105'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:shadow-primary/40'
                                        }`}
                                >
                                    {copiedId === 'sql_modal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copiedId === 'sql_modal' ? 'Copiado!' : 'Copiar SQL Completo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                variant={alertModal.variant}
                buttonText="Entendi"
            />
        </div >
    );
}
