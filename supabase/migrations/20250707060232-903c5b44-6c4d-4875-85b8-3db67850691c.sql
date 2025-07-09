-- Permitir acesso público às credenciais de gateways ativos para checkouts públicos
-- Isso é necessário para que checkouts públicos possam processar pagamentos

CREATE POLICY "Público pode acessar gateways ativos para checkouts"
ON public.gateways
FOR SELECT
USING (is_active = true);

-- Comentário: Esta política permite que usuários anônimos vejam gateways ativos,
-- o que é necessário para que checkouts públicos possam processar pagamentos.
-- As credenciais sensíveis (como access_token) devem ser filtradas no frontend.