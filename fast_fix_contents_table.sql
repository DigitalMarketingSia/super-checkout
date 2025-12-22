-- CORREÇÃO PARA A TABELA CONTENTS
-- Adiciona as colunas que estavam faltando no instalador oficial

DO $$
BEGIN
    -- 1. description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'description') THEN
        ALTER TABLE contents ADD COLUMN description TEXT;
    END IF;

    -- 2. thumbnail_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE contents ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- 3. author_id (Importante: referenciando usuarios)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'author_id') THEN
        ALTER TABLE contents ADD COLUMN author_id UUID REFERENCES auth.users(id);
    END IF;

    -- 4. is_free
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'is_free') THEN
        ALTER TABLE contents ADD COLUMN is_free BOOLEAN DEFAULT false;
    END IF;

    -- 5. image_vertical_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'image_vertical_url') THEN
        ALTER TABLE contents ADD COLUMN image_vertical_url TEXT;
    END IF;

    -- 6. image_horizontal_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'image_horizontal_url') THEN
        ALTER TABLE contents ADD COLUMN image_horizontal_url TEXT;
    END IF;

    -- 7. modules_layout
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'modules_layout') THEN
        ALTER TABLE contents ADD COLUMN modules_layout TEXT DEFAULT 'horizontal';
    END IF;

     -- 8. is_published (Geralmente usado, vamos garantir que existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'is_published') THEN
        ALTER TABLE contents ADD COLUMN is_published BOOLEAN DEFAULT true;
    END IF;

END $$;
