-- SUPER CHECKOUT - SCHEMA DO BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA: domains (Dominios Customizados)
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  checkout_id UUID,
  slug TEXT,
  type TEXT NOT NULL CHECK (type IN ('cname', 'redirect')),
  status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'verifying', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_domains_user_id ON domains(user_id);
CREATE INDEX idx_domains_domain ON domains(domain);
CREATE INDEX idx_domains_status ON domains(status);
CREATE INDEX idx_domains_checkout_id ON domains(checkout_id);

-- RLS Policies para Domains
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own domains"
  ON domains FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read active domains"
  ON domains FOR SELECT
  USING (status = 'active');
