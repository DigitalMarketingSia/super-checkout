-- Add member_area_action column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS member_area_action TEXT DEFAULT 'checkout' CHECK (member_area_action IN ('checkout', 'sales_page'));

-- Update existing products to have default value
UPDATE products SET member_area_action = 'checkout' WHERE member_area_action IS NULL;
