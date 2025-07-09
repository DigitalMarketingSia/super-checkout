
-- Fix production environment for gateways
-- This ensures gateways have proper environment configuration

-- Update existing MercadoPago gateway to use proper environment structure
UPDATE gateways 
SET 
  environment = 'sandbox',
  credentials = jsonb_build_object(
    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
    'publicKeyProd', '',
    'accessTokenProd', '',
    'environment', 'sandbox'
  )
WHERE type = 'mercado_pago';

-- Ensure environment column exists and has proper default
ALTER TABLE gateways ALTER COLUMN environment SET DEFAULT 'sandbox';

-- Update any checkouts without gateway_id to use the active MercadoPago gateway
UPDATE checkouts 
SET gateway_id = (
  SELECT id FROM gateways 
  WHERE type = 'mercado_pago' AND is_active = true 
  LIMIT 1
)
WHERE gateway_id IS NULL AND status = 'active';
