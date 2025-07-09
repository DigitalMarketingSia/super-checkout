-- Atualizar gateway MercadoPago para ambiente de produção
-- Garantir que o gateway está configurado corretamente para produção
UPDATE gateways 
SET 
  environment = 'production',
  is_active = true,
  credentials = jsonb_build_object(
    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
    'publicKeyProd', '',
    'accessTokenProd', '',
    'environment', 'production'
  )
WHERE type = 'mercado_pago' 
AND id = '514d66fe-08de-4be0-8afd-3049adc5414f';

-- Verificar se o gateway existe, caso não exista, criar um padrão
INSERT INTO gateways (
  id,
  name,
  type,
  environment,
  is_active,
  credentials,
  created_at,
  updated_at
)
SELECT 
  '514d66fe-08de-4be0-8afd-3049adc5414f',
  'MercadoPago Produção',
  'mercado_pago',
  'production',
  true,
  jsonb_build_object(
    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
    'publicKeyProd', '',
    'accessTokenProd', '',
    'environment', 'production'
  ),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM gateways 
  WHERE type = 'mercado_pago' 
  AND id = '514d66fe-08de-4be0-8afd-3049adc5414f'
);