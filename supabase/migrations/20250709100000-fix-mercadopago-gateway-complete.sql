-- Migração para garantir gateway MercadoPago configurado corretamente
-- Data: 2025-07-09

-- 1. Primeiro, limpar gateways duplicados ou problemáticos
DELETE FROM gateways 
WHERE type = 'mercado_pago' 
  AND (credentials IS NULL OR credentials = '{}' OR jsonb_typeof(credentials) != 'object');

-- 2. Verificar se existe pelo menos um gateway MercadoPago ativo
DO $$
DECLARE
    gateway_count INTEGER;
    gateway_id UUID;
BEGIN
    -- Contar gateways MercadoPago ativos
    SELECT COUNT(*) INTO gateway_count 
    FROM gateways 
    WHERE type = 'mercado_pago' 
      AND is_active = true 
      AND credentials IS NOT NULL 
      AND jsonb_typeof(credentials) = 'object';
    
    -- Se não existe gateway, criar um padrão
    IF gateway_count = 0 THEN
        -- Verificar se existe algum gateway MercadoPago para atualizar
        SELECT id INTO gateway_id 
        FROM gateways 
        WHERE type = 'mercado_pago' 
        LIMIT 1;
        
        IF gateway_id IS NOT NULL THEN
            -- Atualizar gateway existente
            UPDATE gateways 
            SET 
                name = 'Mercado Pago - Principal',
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
            WHERE id = gateway_id;
        ELSE
            -- Criar novo gateway
            INSERT INTO gateways (
                name, 
                type, 
                credentials, 
                environment, 
                is_active,
                created_at,
                updated_at
            ) VALUES (
                'Mercado Pago - Principal',
                'mercado_pago',
                jsonb_build_object(
                    'publicKeySandbox', 'TEST-128ed321-c483-4220-b857-275935dd8498',
                    'accessTokenSandbox', 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937',
                    'publicKeyProd', '',
                    'accessTokenProd', '',
                    'environment', 'sandbox'
                ),
                'sandbox',
                true,
                now(),
                now()
            );
        END IF;
        
        RAISE NOTICE 'Gateway MercadoPago configurado com sucesso';
    ELSE
        RAISE NOTICE 'Gateway MercadoPago já existe e está ativo';
    END IF;
END $$;

-- 3. Atualizar checkouts que não têm gateway configurado
UPDATE checkouts 
SET gateway_id = (
    SELECT id 
    FROM gateways 
    WHERE type = 'mercado_pago' 
      AND is_active = true 
    LIMIT 1
)
WHERE gateway_id IS NULL 
   OR gateway_id NOT IN (
       SELECT id 
       FROM gateways 
       WHERE type = 'mercado_pago' 
         AND is_active = true
   );

-- 4. Verificação final
DO $$
DECLARE
    final_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_count 
    FROM gateways 
    WHERE type = 'mercado_pago' AND is_active = true;
    
    RAISE NOTICE 'Total de gateways MercadoPago ativos após migração: %', final_count;
END $$;