-- ACTIVE O DOMÍNIO MANUALMENTE
-- Substitua 'pay.agentex.cloud' pelo domínio que você quer ativar
UPDATE domains 
SET status = 'active', 
    verified_at = NOW() 
WHERE domain = 'pay.agentex.cloud';
