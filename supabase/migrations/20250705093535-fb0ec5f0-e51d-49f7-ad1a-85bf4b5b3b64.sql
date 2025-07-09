-- Adicionar campo gateway_id na tabela checkouts
ALTER TABLE public.checkouts 
ADD COLUMN gateway_id UUID REFERENCES public.gateways(id);

-- Associar o checkout existente ao gateway do Mercado Pago
UPDATE public.checkouts 
SET gateway_id = (SELECT id FROM public.gateways WHERE type = 'mercado_pago' LIMIT 1)
WHERE status = 'active';