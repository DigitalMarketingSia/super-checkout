-- Adicionar campo para order bumps na tabela checkouts
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS order_bumps jsonb DEFAULT '[]'::jsonb;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.checkouts.order_bumps IS 'Array de IDs dos produtos configurados como order bumps para este checkout';

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_checkouts_order_bumps ON public.checkouts USING GIN(order_bumps);