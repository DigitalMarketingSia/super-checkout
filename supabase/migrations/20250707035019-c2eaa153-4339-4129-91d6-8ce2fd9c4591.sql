
-- Etapa 1: Limpeza completa dos gateways MercadoPago duplicados

-- Primeiro: Atualizar todos os checkouts para usar o gateway que vamos manter
UPDATE checkouts 
SET gateway_id = '514d66fe-08de-4be0-8afd-3049adc5414f'
WHERE gateway_id IN (
  SELECT id FROM gateways 
  WHERE type = 'mercado_pago' 
  AND id != '514d66fe-08de-4be0-8afd-3049adc5414f'
);

-- Segundo: Deletar todos os gateways MercadoPago duplicados (mantendo apenas um)
DELETE FROM gateways 
WHERE type = 'mercado_pago' 
AND id != '514d66fe-08de-4be0-8afd-3049adc5414f';

-- Terceiro: Padronizar o gateway restante com estrutura consistente e credenciais de teste
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
WHERE type = 'mercado_pago' 
AND id = '514d66fe-08de-4be0-8afd-3049adc5414f';
