-- Add member_area_checkout_id to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS member_area_checkout_id UUID REFERENCES checkouts(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_member_area_checkout_id ON products(member_area_checkout_id);
