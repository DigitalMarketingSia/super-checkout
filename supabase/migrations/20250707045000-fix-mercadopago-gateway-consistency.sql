
-- Correção definitiva dos problemas de consistência do gateway MercadoPago
-- Este script garante que existe apenas 1 gateway ativo e que os checkouts apontem para ele

-- Etapa 1: Identificar e manter apenas o gateway MercadoPago mais recente e ativo
WITH latest_mp_gateway AS (
  SELECT id, name, credentials, environment, is_active, created_at
  FROM gateways 
  WHERE type = 'mercado_pago' 
  AND is_active = true
  ORDER BY created_at DESC 
  LIMIT 1
)
-- Etapa 2: Atualizar todos os checkouts para usar o gateway correto
UPDATE checkouts 
SET gateway_id = (SELECT id FROM latest_mp_gateway)
WHERE gateway_id IS NULL 
   OR gateway_id NOT IN (SELECT id FROM latest_mp_gateway);

-- Etapa 3: Garantir que apenas um gateway MercadoPago está ativo
UPDATE gateways 
SET is_active = false 
WHERE type = 'mercado_pago' 
AND id NOT IN (
  SELECT id FROM gateways 
  WHERE type = 'mercado_pago' 
  AND is_active = true
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Etapa 4: Verificar e padronizar o gateway ativo
UPDATE gateways 
SET 
  name = 'Mercado Pago',
  credentials = CASE 
    WHEN credentials->>'publicKeySandbox' IS NULL OR credentials->>'accessTokenSandbox' IS NULL 
    THEN jsonb_build_object(
      'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
      'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
      'publicKeyProd', '',
      'accessTokenProd', '',
      'environment', 'sandbox'
    )
    ELSE credentials
  END,
  environment = 'sandbox',
  is_active = true,
  updated_at = now()
WHERE type = 'mercado_pago' 
AND is_active = true;

-- Etapa 5: Log de verificação
DO $$
DECLARE
  gateway_count INTEGER;
  checkout_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gateway_count FROM gateways WHERE type = 'mercado_pago' AND is_active = true;
  SELECT COUNT(*) INTO checkout_count FROM checkouts WHERE gateway_id IS NOT NULL;
  
  RAISE NOTICE 'Gateways MercadoPago ativos: %', gateway_count;
  RAISE NOTICE 'Checkouts com gateway configurado: %', checkout_count;
  
  IF gateway_count != 1 THEN
    RAISE WARNING 'ATENÇÃO: Deveria haver exatamente 1 gateway MercadoPago ativo, mas há %', gateway_count;
  END IF;
END $$;
