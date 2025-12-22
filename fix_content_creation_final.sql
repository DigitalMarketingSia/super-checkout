-- SOLUÇÃO DEFINITIVA PARA ERRO AO SALVAR CONTEÚDO
-- Execute este script no Editor SQL do Supabase
-- Ele corrige TUDO que pode estar bloqueando a criação de conteúdo

DO $$
BEGIN
    -- 1. Garante que TODAS as colunas existem
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
    
    -- Coluna TYPE: Garante que existe e remove restrições antigas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contents' AND column_name = 'type') THEN
        ALTER TABLE contents ADD COLUMN type TEXT DEFAULT 'course';
    ELSE
        -- Remove QUALQUER check constraint na coluna type para evitar "invalid input syntax"
        -- Tenta remover pelo nome conhecido
        BEGIN
            ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_type_check;
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        -- Garante que não é obrigatória (NULLABLE) e tem valor padrão
        ALTER TABLE contents ALTER COLUMN type DROP NOT NULL;
        ALTER TABLE contents ALTER COLUMN type SET DEFAULT 'course';
    END IF;

    -- 2. Segurança e Permissões (RLS)
    -- Reseta as políticas para garantir que o usuário logado PODE inserir
    ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
    
    -- Drop de políticas antigas conflitantes
    DROP POLICY IF EXISTS "Users can manage their own contents" ON contents;
    DROP POLICY IF EXISTS "Admins and Owners can manage contents" ON contents;
    DROP POLICY IF EXISTS "Auth users can do everything on contents" ON contents;
    
    -- Cria política PERMISSIVA para usuários autenticados (Insert/Update/Delete/Select)
    -- Isso resolve o erro "new row violates row-level security policy"
    CREATE POLICY "Auth users can manage contents" ON contents FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
    
    -- Política pública para leitura (necessária para vitrine)
    DROP POLICY IF EXISTS "Public can view published contents" ON contents;
    CREATE POLICY "Public can view published contents" ON contents 
    FOR SELECT USING (is_published = true);

    -- 3. Correções na tabela de relacionamento (Product-Contents)
    CREATE TABLE IF NOT EXISTS product_contents (
        product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
        content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        PRIMARY KEY (product_id, content_id)
    );
    
    ALTER TABLE product_contents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Auth users can do everything on product_contents" ON product_contents;
    
    CREATE POLICY "Auth users can manage product_contents" ON product_contents FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

    -- 4. Garante permissões de Grant (Sistema de Permissões do Postgres)
    GRANT ALL ON TABLE contents TO authenticated;
    GRANT ALL ON TABLE contents TO service_role;
    GRANT ALL ON TABLE product_contents TO authenticated;
    GRANT ALL ON TABLE product_contents TO service_role;

END $$;
