-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_contents ENABLE ROW LEVEL SECURITY;

-- Policy for Products: Public can view active products
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'products' AND policyname = 'Public can view active products') THEN
        CREATE POLICY "Public can view active products" ON products FOR SELECT USING (active = true);
    END IF;
END
$$;

-- Policy for Product Contents: Public can view product contents
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'product_contents' AND policyname = 'Public can view product contents') THEN
        CREATE POLICY "Public can view product contents" ON product_contents FOR SELECT USING (true);
    END IF;
END
$$;
