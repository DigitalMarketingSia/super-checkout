-- Add external_reference column to vendas table for better webhook correlation
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Add index for better performance when searching by external_reference
CREATE INDEX IF NOT EXISTS idx_vendas_external_reference ON vendas(external_reference);

-- Add comment explaining the field
COMMENT ON COLUMN vendas.external_reference IS 'External reference from payment gateway (MercadoPago payment ID)';