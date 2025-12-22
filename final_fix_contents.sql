-- SOLUÇÃO FINAL PARA ERRO AO SALVAR CONTEÚDO
-- Execute todo este bloco no Editor SQL do Supabase

DO $$
BEGIN
    -- 1. Remove a restrição de tipo incorreta (que impedia 'course')
    -- Tenta remover pelo nome padrão do Postgres ou verifica se existe restrição de check
    BEGIN
        ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_type_check;
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Constraint contents_type_check not found or could not be dropped.';
    END;

    -- 2. Altera a coluna type para aceitar texto livre e define padrão
    ALTER TABLE contents ALTER COLUMN type DROP NOT NULL;
    ALTER TABLE contents ALTER COLUMN type SET DEFAULT 'course';

    -- 3. Garante que todas as colunas necessárias existem (Repetindo para segurança)
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

    -- 4. Garante permissões RLS para Admins
    ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
    
    -- Remove política antiga restritiva se existir
    DROP POLICY IF EXISTS "Users can manage their own contents" ON contents;
    
    -- Cria nova política permitindo Admins OU Donos da Área de Membros
    CREATE POLICY "Admins and Owners can manage contents" ON contents FOR ALL USING (
        -- É Admin
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
        OR 
        -- É Dono da Área
        (EXISTS (SELECT 1 FROM member_areas ma WHERE ma.id = contents.member_area_id AND ma.owner_id = auth.uid()))
    );

    -- Permite leitura pública de conteudos publicados (necessário para o player funcionar)
    DROP POLICY IF EXISTS "Public can view published contents" ON contents;
    CREATE POLICY "Public can view published contents" ON contents FOR SELECT USING (is_published = true);

END $$;
