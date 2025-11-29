-- Fix Member Area Deletion (Cascade Delete)

-- 1. Contents -> Member Area
ALTER TABLE contents
DROP CONSTRAINT IF EXISTS contents_member_area_id_fkey;

ALTER TABLE contents
ADD CONSTRAINT contents_member_area_id_fkey
FOREIGN KEY (member_area_id)
REFERENCES member_areas(id)
ON DELETE CASCADE;

-- 2. Modules -> Contents
ALTER TABLE modules
DROP CONSTRAINT IF EXISTS modules_content_id_fkey;

ALTER TABLE modules
ADD CONSTRAINT modules_content_id_fkey
FOREIGN KEY (content_id)
REFERENCES contents(id)
ON DELETE CASCADE;

-- 3. Lessons -> Modules
ALTER TABLE lessons
DROP CONSTRAINT IF EXISTS lessons_module_id_fkey;

ALTER TABLE lessons
ADD CONSTRAINT lessons_module_id_fkey
FOREIGN KEY (module_id)
REFERENCES modules(id)
ON DELETE CASCADE;

-- 4. Access Grants -> Contents
ALTER TABLE access_grants
DROP CONSTRAINT IF EXISTS access_grants_content_id_fkey;

ALTER TABLE access_grants
ADD CONSTRAINT access_grants_content_id_fkey
FOREIGN KEY (content_id)
REFERENCES contents(id)
ON DELETE CASCADE;

-- 5. Product Contents -> Contents
ALTER TABLE product_contents
DROP CONSTRAINT IF EXISTS product_contents_content_id_fkey;

ALTER TABLE product_contents
ADD CONSTRAINT product_contents_content_id_fkey
FOREIGN KEY (content_id)
REFERENCES contents(id)
ON DELETE CASCADE;
