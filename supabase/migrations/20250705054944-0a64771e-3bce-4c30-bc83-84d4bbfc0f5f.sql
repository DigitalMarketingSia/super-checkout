-- Inserir perfil para o usuário logado atual
INSERT INTO public.profiles (id, email, role)
VALUES ('ed548983-0d73-441f-acc8-afdf9cbef305', 'contato.tiktoy@gmail.com', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Garantir que novos usuários também tenham perfil criado automaticamente
-- Recriar a função handle_new_user para ser mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'admin')
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = COALESCE(profiles.role, 'admin');
  RETURN new;
END;
$$;