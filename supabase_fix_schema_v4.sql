-- CORREÇÃO FINAL V4 - Tabelas de Domínios, Gateways e Checkouts
-- Execute este script para garantir que todas as tabelas e pastas existam.

-- 1. Criar Balde 'checkouts' (para banners/logos de checkout)
INSERT INTO storage.buckets (id, name, public) VALUES ('checkouts', 'checkouts', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access Checkouts" ON storage.objects FOR SELECT USING (bucket_id = 'checkouts');
CREATE POLICY "Authenticated Upload Checkouts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checkouts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Checkouts" ON storage.objects FOR UPDATE USING (bucket_id = 'checkouts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Checkouts" ON storage.objects FOR DELETE USING (bucket_id = 'checkouts' AND auth.role() = 'authenticated');

-- 2. Tabela: DOMAINS (Domínios Personalizados)
CREATE TABLE IF NOT EXISTS domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending_verification', -- pending_verification, active, invalid
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS para Domains
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own domains" ON domains;
CREATE POLICY "Users can manage their own domains" ON domains FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Public can view active domains" ON domains;
CREATE POLICY "Public can view active domains" ON domains FOR SELECT USING (true); -- Public needs to see domains to resolve them

-- 3. Tabela: GATEWAYS (Pagamentos)
CREATE TABLE IF NOT EXISTS gateways (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider TEXT NOT NULL, -- mercadopago, stripe, etc
  credentials JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, provider) -- Um gateway de cada tipo por usuário
);

-- Políticas RLS para Gateways
ALTER TABLE gateways ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own gateways" ON gateways;
CREATE POLICY "Users can manage their own gateways" ON gateways FOR ALL USING (auth.uid() = user_id);
-- Public SHOULD NOT see gateways, code uses server-side logic or owner context

-- 4. Garantir relacionamento CHECKOUTS -> DOMAINS
-- Se a tabela checkouts já existe sem essa FK, adicionamos agora
DO $$
BEGIN
  -- Se não existir a coluna domain_id
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'checkouts' AND column_name = 'domain_id') THEN
    ALTER TABLE checkouts ADD COLUMN domain_id UUID REFERENCES domains(id);
  END IF;
  
  -- Se não existir a coluna gateway_id
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'checkouts' AND column_name = 'gateway_id') THEN
    ALTER TABLE checkouts ADD COLUMN gateway_id UUID REFERENCES gateways(id);
  END IF;
END $$;

-- 5. Atualizar Cache
NOTIFY pgrst, 'reload config';
