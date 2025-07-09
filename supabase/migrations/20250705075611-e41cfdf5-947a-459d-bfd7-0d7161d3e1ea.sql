
-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagens-produtos', 
  'imagens-produtos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Criar política para permitir upload público de imagens
CREATE POLICY "Permitir upload público de imagens de produtos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'imagens-produtos');

-- Criar política para permitir leitura pública das imagens
CREATE POLICY "Permitir leitura pública de imagens de produtos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'imagens-produtos');

-- Criar política para permitir atualização das imagens (para admins)
CREATE POLICY "Permitir atualização de imagens de produtos para admins" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'imagens-produtos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Criar política para permitir exclusão das imagens (para admins)
CREATE POLICY "Permitir exclusão de imagens de produtos para admins" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'imagens-produtos' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
