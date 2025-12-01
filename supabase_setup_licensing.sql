-- Tabela de Licenças
CREATE TABLE IF NOT EXISTS licenses (
  key UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_email TEXT NOT NULL,
  client_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'refunded')),
  allowed_domain TEXT, -- O domínio onde a instalação foi ativada
  plan TEXT DEFAULT 'lifetime',
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Log de Validações
CREATE TABLE IF NOT EXISTS validation_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_key UUID REFERENCES licenses(key),
  ip_address TEXT,
  domain TEXT,
  user_agent TEXT,
  valid BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Segurança)
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;

-- Apenas o ADMIN (dono do projeto) pode ver e criar licenças
CREATE POLICY "Admin can manage licenses" ON licenses
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Logs podem ser criados pela API (service role) ou admin
CREATE POLICY "Admin can view logs" ON validation_logs
  FOR SELECT USING (auth.role() = 'authenticated');
