-- FIX SCRIPT: Run this in Supabase SQL Editor

-- 1. Fix 'products' bucket missing
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Authenticated Upload Products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Products" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Products" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- 2. Fix 'orders.user_id' column missing (Rename customer_user_id)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_user_id') THEN
    ALTER TABLE orders RENAME COLUMN customer_user_id TO user_id;
  END IF;
END $$;

-- 3. Fix 'products.category' column missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 4. Refresh Schema Cache
NOTIFY pgrst, 'reload config';
