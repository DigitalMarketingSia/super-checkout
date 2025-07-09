-- Execute a migration para adicionar external_reference à tabela vendas
-- Esta migration garante que o campo necessário para o webhook exists

-- Add external_reference column to vendas table for better webhook correlation
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Add payment_id column as well for additional correlation
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Add index for better performance when searching by external_reference
CREATE INDEX IF NOT EXISTS idx_vendas_external_reference ON vendas(external_reference);

-- Add index for payment_id searches
CREATE INDEX IF NOT EXISTS idx_vendas_payment_id ON vendas(payment_id);

-- Add comments explaining the fields
COMMENT ON COLUMN vendas.external_reference IS 'External reference from payment gateway (MercadoPago payment ID)';
COMMENT ON COLUMN vendas.payment_id IS 'Payment ID from MercadoPago for webhook correlation';