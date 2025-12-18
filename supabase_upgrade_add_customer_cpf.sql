-- ==========================================
-- UPGRADE SCRIPT - Fix Missing Columns
-- ==========================================
-- Execute este script no seu Supabase ATUAL para adicionar colunas faltantes
-- É SEGURO rodar múltiplas vezes (idempotente)

-- Fix: Adicionar customer_cpf à tabela orders
DO $$
BEGIN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
    RAISE NOTICE 'Coluna customer_cpf adicionada/verificada com sucesso';
    RAISE NOTICE 'Upgrade concluído com sucesso!';
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Coluna customer_cpf já existe';
        RAISE NOTICE 'Upgrade concluído com sucesso!';
END $$;
