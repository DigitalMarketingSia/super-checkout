-- ==========================================
-- FIX FINAL - Remove constraint NOT NULL da coluna 'amount' antiga
-- ==========================================
-- A tabela orders tem DUAS colunas: 'amount' (antiga, NOT NULL) e 'total' (nova)
-- O código usa 'total', mas 'amount' ainda exige valor, causando erro.
-- Solução: Remover a constraint NOT NULL de 'amount' (ou deletar a coluna)

DO $$
BEGIN
    -- Opção 1: Remover constraint NOT NULL de 'amount' (mais seguro)
    ALTER TABLE orders ALTER COLUMN amount DROP NOT NULL;
    
    RAISE NOTICE 'Constraint NOT NULL removida da coluna amount (legado).';
    RAISE NOTICE 'Agora o sistema pode usar apenas a coluna total.';
EXCEPTION
    WHEN undefined_column THEN 
        RAISE NOTICE 'Coluna amount não existe (tudo bem, usando total).';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao modificar coluna amount: %. Continuando...', SQLERRM;
END $$;
