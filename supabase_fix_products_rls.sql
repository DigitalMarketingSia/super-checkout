-- Enable RLS on products table if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to active products
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'products' AND policyname = 'Public can view active products') THEN
        CREATE POLICY "Public can view active products" ON products FOR SELECT USING (active = true);
    END IF;
END
$$;
