-- ==========================================
-- FIX RLS SCRIPT - ENABLE PUBLIC READ (SELECT)
-- ==========================================
-- Este script permite que usuários públicos (deslogados) LEIAM pedidos e pagamentos.
-- Isso é fundamental para que a página de obrigado/pix consulte o status do pedido
-- e mude para "Aprovado" quando o webhook atualizar o banco.

DO $$
BEGIN
    -- 1. Orders Public Select
    BEGIN
        CREATE POLICY "Public can view orders" ON orders FOR SELECT USING (true);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

    -- 2. Payments Public Select
    BEGIN
        CREATE POLICY "Public can view payments" ON payments FOR SELECT USING (true);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    RAISE NOTICE 'RLS corrigido: Permissão de LEITURA pública de Pedidos e Pagamentos ativada.';
END $$;
