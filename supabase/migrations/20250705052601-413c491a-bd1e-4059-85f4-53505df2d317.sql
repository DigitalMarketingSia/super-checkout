-- Corrigir avisos de segurança "Function Search Path Mutable"
-- Recriar todas as funções com search_path seguro

-- 1. Função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'admin');
  RETURN new;
END;
$function$;

-- 2. Função processar_venda
CREATE OR REPLACE FUNCTION public.processar_venda(
  cliente_nome text, 
  cliente_email text, 
  cliente_cpf text DEFAULT NULL::text, 
  produtos jsonb DEFAULT NULL::jsonb, 
  metodo_pagamento text DEFAULT 'cartão'::text, 
  valor_total numeric DEFAULT 0.0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  cliente_id UUID;
  venda_id UUID;
  produto JSONB;
BEGIN
  -- Verificar se cliente já existe pelo email
  SELECT id INTO cliente_id FROM public.clientes WHERE email = cliente_email;
  
  -- Se não existe, criar novo cliente
  IF cliente_id IS NULL THEN
    INSERT INTO public.clientes (nome, email, cpf)
    VALUES (cliente_nome, cliente_email, cliente_cpf)
    RETURNING id INTO cliente_id;
  END IF;
  
  -- Criar a venda
  INSERT INTO public.vendas (id_cliente, valor_total, metodo_pagamento, status)
  VALUES (cliente_id, valor_total, metodo_pagamento, 'concluida')
  RETURNING id INTO venda_id;
  
  -- Inserir itens da venda (apenas se produtos não for NULL)
  IF produtos IS NOT NULL THEN
    FOR produto IN SELECT * FROM jsonb_array_elements(produtos)
    LOOP
      INSERT INTO public.itens_da_venda (id_venda, id_produto, preco_unitario, quantidade)
      VALUES (
        venda_id,
        (produto->>'id_produto')::UUID,
        (produto->>'preco_unitario')::DECIMAL,
        COALESCE((produto->>'quantidade')::INTEGER, 1)
      );
    END LOOP;
  END IF;
  
  RETURN venda_id;
END;
$function$;

-- 3. Função buscar_produtos_por_tipo
CREATE OR REPLACE FUNCTION public.buscar_produtos_por_tipo(tipo text DEFAULT 'all'::text)
RETURNS TABLE(
  id uuid, 
  nome text, 
  descricao text, 
  preco numeric, 
  url_imagem text, 
  is_principal boolean, 
  is_orderbump boolean, 
  is_upsell boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  CASE tipo
    WHEN 'principal' THEN
      RETURN QUERY SELECT p.id, p.nome, p.descricao, p.preco, p.url_imagem, p.is_principal, p.is_orderbump, p.is_upsell
                   FROM public.produtos p WHERE p.is_principal = true;
    WHEN 'orderbump' THEN
      RETURN QUERY SELECT p.id, p.nome, p.descricao, p.preco, p.url_imagem, p.is_principal, p.is_orderbump, p.is_upsell
                   FROM public.produtos p WHERE p.is_orderbump = true;
    WHEN 'upsell' THEN
      RETURN QUERY SELECT p.id, p.nome, p.descricao, p.preco, p.url_imagem, p.is_principal, p.is_orderbump, p.is_upsell
                   FROM public.produtos p WHERE p.is_upsell = true;
    ELSE
      RETURN QUERY SELECT p.id, p.nome, p.descricao, p.preco, p.url_imagem, p.is_principal, p.is_orderbump, p.is_upsell
                   FROM public.produtos p;
  END CASE;
END;
$function$;

-- 4. Função trigger_email_pos_venda
CREATE OR REPLACE FUNCTION public.trigger_email_pos_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Esta função pode ser expandida para chamar um Edge Function
  -- que enviará o email usando Resend ou SendGrid
  PERFORM pg_notify('nova_venda', json_build_object(
    'venda_id', NEW.id,
    'cliente_id', NEW.id_cliente,
    'valor_total', NEW.valor_total,
    'metodo_pagamento', NEW.metodo_pagamento
  )::text);
  
  RETURN NEW;
END;
$function$;

-- 5. Função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;