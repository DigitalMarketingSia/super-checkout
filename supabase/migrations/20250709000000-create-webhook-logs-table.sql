
-- Tabela para logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type text NOT NULL, -- 'mercadopago', 'stripe', etc
  event_type text NOT NULL,   -- 'payment', 'order', etc
  payload jsonb NOT NULL,     -- Dados completos do webhook
  headers jsonb,              -- Headers da requisição
  processed_at timestamp with time zone DEFAULT now(),
  processing_status text DEFAULT 'received', -- 'received', 'processed', 'failed'
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- RLS policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de webhooks (sem autenticação)
CREATE POLICY "Allow webhook insertion" ON webhook_logs
  FOR INSERT 
  WITH CHECK (true);

-- Política para leitura apenas por usuários autenticados (admin)
CREATE POLICY "Allow authenticated read" ON webhook_logs
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Adicionar colunas adicionais na tabela vendas para melhor rastreamento
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS webhook_data jsonb,
ADD COLUMN IF NOT EXISTS payment_details jsonb,
ADD COLUMN IF NOT EXISTS webhook_received_at timestamp with time zone;

-- Comentários para documentação
COMMENT ON TABLE webhook_logs IS 'Logs de todos os webhooks recebidos do sistema';
COMMENT ON COLUMN webhook_logs.webhook_type IS 'Tipo do webhook (mercadopago, stripe, etc)';
COMMENT ON COLUMN webhook_logs.event_type IS 'Tipo do evento (payment, order, etc)';
COMMENT ON COLUMN webhook_logs.payload IS 'Dados completos recebidos no webhook';
COMMENT ON COLUMN webhook_logs.processing_status IS 'Status de processamento do webhook';
