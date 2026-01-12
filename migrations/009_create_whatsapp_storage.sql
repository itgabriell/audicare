-- Criar bucket para armazenar mídias do WhatsApp
-- Execute este SQL no Supabase SQL Editor

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso público para leitura
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Política para usuários autenticados fazerem upload
CREATE POLICY IF NOT EXISTS "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' AND
  auth.role() = 'authenticated'
);

-- Política para usuários autenticados atualizarem seus próprios arquivos
CREATE POLICY IF NOT EXISTS "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'whatsapp-media' AND
  auth.role() = 'authenticated'
);

-- Política para usuários autenticados deletarem seus próprios arquivos
CREATE POLICY IF NOT EXISTS "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media' AND
  auth.role() = 'authenticated'
);

