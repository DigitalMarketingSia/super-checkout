-- Add Menu and FAQ columns to Member Areas
ALTER TABLE member_areas
ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;

-- Add Visibility columns to Products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS visible_in_member_area BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS for_sale BOOLEAN DEFAULT true;
