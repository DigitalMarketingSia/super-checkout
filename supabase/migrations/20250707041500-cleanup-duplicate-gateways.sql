-- Limpeza final e definitiva dos gateways MercadoPago duplicados
-- Manter apenas o gateway mais recente e com melhor estrutura

-- Etapa 1: Identificar o gateway mais recente
-- Primeiro: Atualizar todos os checkouts para usar o gateway mais recente
UPDATE checkouts 
SET gateway_id = (
  SELECT id FROM gateways 
  WHERE type = 'mercado_pago' 
  AND is_active = true
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE gateway_id IS NOT NULL
AND gateway_id IN (
  SELECT id FROM gateways WHERE type = 'mercado_pago'
);

-- Etapa 2: Manter apenas o gateway mais recente
DELETE FROM gateways 
WHERE type = 'mercado_pago' 
AND id NOT IN (
  SELECT id FROM gateways 
  WHERE type = 'mercado_pago' 
  AND is_active = true
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Etapa 3: Garantir que o gateway restante tenha estrutura padronizada
UPDATE gateways 
SET 
  name = 'Mercado Pago',
  credentials = jsonb_build_object(
    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
    'publicKeyProd', '',
    'accessTokenProd', '',
    'environment', 'sandbox'
  ),
  environment = 'sandbox',
  is_active = true,
  updated_at = now()
WHERE type = 'mercado_pago';

-- Etapa 4: Verificar estrutura final
-- Esta query deve retornar apenas 1 gateway MercadoPaco ativo
-- SELECT id, name, type, environment, is_active, created_at FROM gateways WHERE type = 'mercado_pago';