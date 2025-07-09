-- Primeiro, vamos verificar as configurações existentes e padronizar as chaves
-- Corrigir chaves existentes para padronizar sem prefixo "footer_"

-- Atualizar as chaves existentes para o formato esperado pelo código
UPDATE configuracoes 
SET chave = 'exibir_informacoes_legais'
WHERE chave = 'exibir_termos_legais';

-- Inserir configurações faltantes com valores padrão se não existirem
INSERT INTO configuracoes (chave, valor, descricao) 
VALUES 
  ('texto_introdutorio', 'Este site é seguro e suas informações estão protegidas. Para dúvidas ou suporte, entre em contato:', 'Texto introdutório do footer'),
  ('nome_vendedor', 'Equipe Super Checkout', 'Nome do vendedor'),
  ('link_termos_compra', '/termos-de-compra', 'Link para os termos de compra'),
  ('link_politica_privacidade', '/politica-de-privacidade', 'Link para a política de privacidade'),
  ('texto_copyright', '© 2024 Super Checkout - Todos os direitos reservados', 'Texto de copyright')
ON CONFLICT (chave) DO NOTHING;