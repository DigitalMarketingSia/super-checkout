-- SOLUÇÃO FINAL V2 (ROBUSTA)
-- Este script verifica se a coluna existe antes de tentar alterar
-- Execute todo este bloco no Editor SQL do Supabase

DO $$
BEGIN
    -- 1. Coluna TYPE (Causa do erro anterior)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'type') THEN
        -- Se não existe, cria já correta
        ALTER TABLE contents ADD COLUMN type TEXT DEFAULT 'course';
    ELSE
        -- Se já existe, tenta remover restrições antigas e arrumar
        BEGIN
            ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_type_check;
        EXCEPTION WHEN OTHERS THEN 
            RAISE NOTICE 'Constraint contents_type_check ignorada';
        END;
        
        ALTER TABLE contents ALTER COLUMN type DROP NOT NULL;
        ALTER TABLE contents ALTER COLUMN type SET DEFAULT 'course';
    END IF;

    -- 2. Adiciona as outras colunas que faltavam (segurança)
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS image_vertical_url TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS image_horizontal_url TEXT;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS modules_layout TEXT DEFAULT 'horizontal';
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
    ALTER TABLE contents ADD COLUMN IF NOT EXISTS card_style TEXT DEFAULT 'horizontal';

    -- 3. Atualiza permissões de segurança (RLS)
    ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
    
    -- Remove política antiga se existir
    DROP POLICY IF EXISTS "Users can manage their own contents" ON contents;
    DROP POLICY IF EXISTS "Admins and Owners can manage contents" ON contents;
    
    -- Cria nova política permitindo Admins OU Donos da Área de Membros
    CREATE POLICY "Admins and Owners can manage contents" ON contents FOR ALL USING (
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) OR 
        (EXISTS (SELECT 1 FROM member_areas ma WHERE ma.id = contents.member_area_id AND ma.owner_id = auth.uid()))
    );

    -- Permite leitura pública de conteudos publicados
    DROP POLICY IF EXISTS "Public can view published contents" ON contents;
    CREATE POLICY "Public can view published contents" ON contents FOR SELECT USING (is_published = true);

END $$;
