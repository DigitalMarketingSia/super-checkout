-- CORREÇÃO FINAL V3 - Tabela de Produtos e Permissões

-- 1. Adicionar colunas que a aplicação exige e que ainda faltam
ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_action TEXT DEFAULT 'none';
ALTER TABLE products ADD COLUMN IF NOT EXISTS member_area_checkout_id UUID REFERENCES checkouts(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS visible_in_member_area BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS for_sale BOOLEAN DEFAULT true;

-- 2. Garantir que seu usuário seja Admin (Correção do erro "Unauthorized")
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'contato.tiktoy@gmail.com';

-- 3. Atualizar Cache do Supabase (Importante para reconhecer as novas colunas)
NOTIFY pgrst, 'reload config';
