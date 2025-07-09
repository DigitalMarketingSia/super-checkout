
-- Correção definitiva e final dos problemas de gateway/checkout
-- Este script resolve todos os problemas de inconsistência de uma vez por todas

-- Etapa 1: Limpar gateways duplicados/inválidos e manter apenas um ativo
WITH cleanup_gateways AS (
  -- Identificar o melhor gateway MercadoPago para manter
  SELECT id FROM gateways 
  WHERE type = 'mercado_pago' 
  AND (
    credentials->>'publicKeySandbox' IS NOT NULL 
    OR credentials->>'publicKey' IS NOT NULL
  )
  ORDER BY 
    CASE WHEN is_active THEN 1 ELSE 2 END,
    created_at DESC 
  LIMIT 1
)
-- Deletar todos os outros gateways MercadoPago
DELETE FROM gateways 
WHERE type = 'mercado_pago' 
AND id NOT IN (SELECT id FROM cleanup_gateways);

-- Etapa 2: Se não há gateway, criar um com credenciais de teste
INSERT INTO gateways (name, type, credentials, environment, is_active)
SELECT 
  'Mercado Pago',
  'mercado_pago',
  jsonb_build_object(
    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
    'publicKeyProd', '',
    'accessTokenProd', '',
    'environment', 'sandbox'
  ),
  'sandbox',
  true
WHERE NOT EXISTS (SELECT 1 FROM gateways WHERE type = 'mercado_pago');

-- Etapa 3: Garantir que o gateway existente tenha credenciais válidas
UPDATE gateways 
SET 
  name = 'Mercado Pago',
  credentials = CASE 
    WHEN credentials->>'publicKeySandbox' IS NULL THEN
      jsonb_build_object(
        'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
        'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
        'publicKeyProd', COALESCE(credentials->>'publicKeyProd', ''),
        'accessTokenProd', COALESCE(credentials->>'accessTokenProd', ''),
        'environment', 'sandbox'
      )
    ELSE credentials
  END,
  environment = 'sandbox',
  is_active = true,
  updated_at = now()
WHERE type = 'mercado_pago';

-- Etapa 4: Atualizar todos os checkouts para usar o gateway ativo
UPDATE checkouts 
SET 
  gateway_id = (SELECT id FROM gateways WHERE type = 'mercado_pago' AND is_active = true LIMIT 1),
  updated_at = now()
WHERE gateway_id IS NULL 
   OR gateway_id NOT IN (SELECT id FROM gateways WHERE type = 'mercado_pago' AND is_active = true);

-- Etapa 5: Verificação final e log
DO $$
DECLARE
  gateway_count INTEGER;
  checkout_count INTEGER;
  gateway_record RECORD;
BEGIN
  SELECT COUNT(*) INTO gateway_count FROM gateways WHERE type = 'mercado_pago' AND is_active = true;
  SELECT COUNT(*) INTO checkout_count FROM checkouts WHERE gateway_id IS NOT NULL;
  
  RAISE NOTICE '🔧 CORREÇÃO FINAL APLICADA:';
  RAISE NOTICE '   - Gateways MercadoPago ativos: %', gateway_count;
  RAISE NOTICE '   - Checkouts com gateway: %', checkout_count;
  
  -- Log detalhes do gateway
  SELECT id, name, environment, is_active INTO gateway_record 
  FROM gateways WHERE type = 'mercado_pago' AND is_active = true LIMIT 1;
  
  IF gateway_record IS NOT NULL THEN
    RAISE NOTICE '   - Gateway ID: %', gateway_record.id;
    RAISE NOTICE '   - Gateway Nome: %', gateway_record.name;
    RAISE NOTICE '   - Ambiente: %', gateway_record.environment;
  ELSE
    RAISE WARNING '❌ ERRO: Nenhum gateway ativo encontrado após correção!';
  END IF;
  
  IF gateway_count != 1 THEN
    RAISE WARNING '❌ ATENÇÃO: Deveria haver exatamente 1 gateway ativo, mas há %', gateway_count;
  END IF;
END $$;
