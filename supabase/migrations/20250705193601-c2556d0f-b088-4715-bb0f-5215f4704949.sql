-- Limpar gateways duplicados do Mercado Pago
-- Manter apenas o mais recente e com melhor estrutura
DELETE FROM gateways 
WHERE type = 'mercado_pago' 
AND id = '3ebfa197-d627-4c3b-be02-8f19b91b4b25';

-- Atualizar o gateway restante para ter estrutura consistente
UPDATE gateways 
SET credentials = jsonb_build_object(
  'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
  'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
  'publicKeyProd', '',
  'accessTokenProd', '',
  'environment', 'sandbox'
)
WHERE type = 'mercado_pago' 
AND id = '514d66fe-08de-4be0-8afd-3049adc5414f';

-- Adicionar coluna environment para controlar o ambiente ativo
ALTER TABLE gateways ADD COLUMN IF NOT EXISTS environment text DEFAULT 'sandbox';