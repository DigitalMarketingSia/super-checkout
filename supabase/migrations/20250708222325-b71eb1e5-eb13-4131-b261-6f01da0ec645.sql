-- Corrigir gateway do Mercado Pago com credenciais consistentes
UPDATE gateways 
SET 
  credentials = jsonb_build_object(
    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
    'publicKeyProd', 'APP_USR-37374372-8613-40f6-ab32-72cdb5cb01c6',
    'accessTokenProd', 'APP_USR-3388903873791416-070505-026c2ff8640e29c9a21e69cff441f7d2-337331937'
  ),
  environment = 'sandbox'
WHERE type = 'mercado_pago' AND id = '646caa90-fc3e-4228-99e6-4f2863886353';

-- Garantir que apenas um gateway MercadoPago esteja ativo
UPDATE gateways SET is_active = false WHERE type = 'mercado_pago' AND id != '646caa90-fc3e-4228-99e6-4f2863886353';
UPDATE gateways SET is_active = true WHERE type = 'mercado_pago' AND id = '646caa90-fc3e-4228-99e6-4f2863886353';