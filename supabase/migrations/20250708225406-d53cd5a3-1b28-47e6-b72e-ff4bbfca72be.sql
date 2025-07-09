-- Atualizar gateways existentes com credenciais de produção para environment='production'
UPDATE public.gateways 
SET environment = 'production'
WHERE type = 'mercado_pago' 
  AND (
    (credentials->>'publicKeyProd' IS NOT NULL AND credentials->>'publicKeyProd' LIKE 'APP_USR-%') 
    OR 
    (credentials->>'accessTokenProd' IS NOT NULL AND credentials->>'accessTokenProd' LIKE 'APP_USR-%')
  );