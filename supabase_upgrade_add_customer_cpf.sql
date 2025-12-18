-- ==========================================
-- UPGRADE SCRIPT - Fix Missing Columns
-- ==========================================
-- Execute este script no seu Supabase ATUAL para adicionar colunas faltantes
-- É SEGURO rodar múltiplas vezes (idempotente)

-- Fix: Adicionar customer_cpf à tabela orders
DO $$
BEGIN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2);
    RAISE NOTICE 'Colunas (customer_cpf, items, total) adicionadas/verificadas com sucesso';
    RAISE NOTICE 'Upgrade concluído com sucesso!';
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Colunas já existem ou erro silencioso capturado';
        RAISE NOTICE 'Upgrade concluído com sucesso!';
END $$;
