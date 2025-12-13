-- ============================================
-- RESETAR SENHA DO USUÁRIO
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- IMPORTANTE: Este script usa a Admin API do Supabase
-- Você precisa executar via Dashboard ou usar a função abaixo

-- Opção 1: Via Dashboard do Supabase
-- 1. Vá em Authentication → Users
-- 2. Encontre o usuário: contato.tiktoy@gmail.com
-- 3. Clique nos 3 pontinhos → "Reset Password"
-- 4. Defina a nova senha: 123456

-- Opção 2: Via SQL (requer extensão)
-- Esta query atualiza o hash da senha diretamente
-- ATENÇÃO: Use com cuidado!

-- Para resetar para senha "123456", você precisa usar a API Admin
-- Não é possível fazer via SQL direto por segurança

-- ============================================
-- INFORMAÇÕES DO USUÁRIO
-- ============================================

SELECT 
  '✅ USUÁRIO EXISTE' as status,
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'name' as nome
FROM auth.users 
WHERE email = 'contato.tiktoy@gmail.com';

-- ============================================
-- PROBLEMA IDENTIFICADO
-- ============================================

-- O usuário existe mas os pedidos recentes não estão vinculados:

SELECT 
  '❌ PEDIDOS NÃO VINCULADOS' as problema,
  id as pedido_id,
  status,
  customer_user_id,
  created_at
FROM orders 
WHERE customer_email = 'contato.tiktoy@gmail.com'
  AND customer_user_id IS NULL
ORDER BY created_at DESC;

-- ============================================
-- SOLUÇÃO: VINCULAR PEDIDOS PAGOS AO USUÁRIO
-- ============================================

-- Atualizar pedidos pagos para vincular ao usuário
UPDATE orders 
SET customer_user_id = 'bbb8bdfb-187b-4afe-9b32-8bb9b34e2b0d'
WHERE customer_email = 'contato.tiktoy@gmail.com'
  AND customer_user_id IS NULL
  AND status = 'paid';

-- Verificar se funcionou
SELECT 
  '✅ PEDIDOS VINCULADOS' as resultado,
  id,
  status,
  customer_user_id,
  created_at
FROM orders 
WHERE customer_email = 'contato.tiktoy@gmail.com'
  AND status = 'paid'
ORDER BY created_at DESC;

-- ============================================
-- CONCEDER ACESSO AOS CONTEÚDOS
-- ============================================

-- Buscar produtos dos pedidos pagos
WITH paid_orders AS (
  SELECT DISTINCT o.id as order_id, c.product_id
  FROM orders o
  JOIN checkouts c ON c.id = o.checkout_id
  WHERE o.customer_email = 'contato.tiktoy@gmail.com'
    AND o.status = 'paid'
),
product_contents_to_grant AS (
  SELECT DISTINCT 
    'bbb8bdfb-187b-4afe-9b32-8bb9b34e2b0d' as user_id,
    pc.content_id,
    po.product_id
  FROM paid_orders po
  JOIN product_contents pc ON pc.product_id = po.product_id
)
INSERT INTO access_grants (user_id, content_id, product_id, status, granted_at)
SELECT user_id, content_id, product_id, 'active', NOW()
FROM product_contents_to_grant
ON CONFLICT (user_id, content_id) DO NOTHING;

-- Verificar acessos concedidos
SELECT 
  '✅ ACESSOS CONCEDIDOS' as resultado,
  ag.id,
  c.title as conteudo,
  ag.status,
  ag.granted_at
FROM access_grants ag
LEFT JOIN contents c ON c.id = ag.content_id
WHERE ag.user_id = 'bbb8bdfb-187b-4afe-9b32-8bb9b34e2b0d'
ORDER BY ag.granted_at DESC;
