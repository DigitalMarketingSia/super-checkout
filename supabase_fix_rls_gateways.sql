-- ==========================================
-- FIX RLS SCRIPT - ENABLE PUBLIC GATEWAY ACCESS
-- ==========================================
-- Este script corrige o erro "Configuração inválida" no checkout público
-- Ele permite que o checkout leia as chaves do gateway (necessário para o frontend atual)

DO $$
BEGIN
    -- 1. Gateways RLS
    -- Ensure RLS is enabled (idempotent-ish, usually safe to run repeatedly)
    ALTER TABLE gateways ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can view active gateways" ON gateways;

    CREATE POLICY "Public can view active gateways" ON gateways 
    FOR SELECT 
    USING (active = true OR is_active = true);

    RAISE NOTICE 'RLS corrigido: Acesso público liberado para gateways ativos.';
END $$;
