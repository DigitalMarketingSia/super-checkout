-- Criar tabela para checkouts
CREATE TABLE public.checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  payment_methods JSONB DEFAULT '["pix", "credit_card", "boleto"]'::jsonb,
  required_form_fields JSONB DEFAULT '["name", "email", "phone", "cpf"]'::jsonb,
  header_image_url TEXT,
  timer_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para checkouts
CREATE POLICY "Administradores podem gerenciar checkouts"
ON public.checkouts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Público pode ver checkouts ativos"
ON public.checkouts
FOR SELECT
USING (status = 'active');

-- Criar tabela para gateways de pagamento
CREATE TABLE public.gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'mercadopago', 'stripe', etc
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para gateways
ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para gateways
CREATE POLICY "Usuários podem gerenciar seus próprios gateways"
ON public.gateways
FOR ALL
USING (auth.uid() = user_id);

-- Criar tabela para domínios
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para domínios
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para domínios
CREATE POLICY "Usuários podem gerenciar seus próprios domínios"
ON public.domains
FOR ALL
USING (auth.uid() = user_id);

-- Função para atualizar timestamps
CREATE TRIGGER update_checkouts_updated_at
BEFORE UPDATE ON public.checkouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gateways_updated_at
BEFORE UPDATE ON public.gateways
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_domains_updated_at
BEFORE UPDATE ON public.domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;