-- Configuração do Supabase Storage para chat-media e avatars
-- Execute este SQL no Supabase Query Editor

-- Criar bucket público para mídias do chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket público para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para chat-media

-- SELECT: Permitido para public (anon)
CREATE POLICY "chat-media_public_select" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-media');

-- INSERT: Permitido para authenticated
CREATE POLICY "chat-media_authenticated_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- UPDATE: Permitido para authenticated (para sobrescrever)
CREATE POLICY "chat-media_authenticated_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- Políticas para avatars

-- SELECT: Permitido para public (anon)
CREATE POLICY "avatars_public_select" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- INSERT: Permitido para authenticated
CREATE POLICY "avatars_authenticated_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- UPDATE: Permitido para authenticated (para sobrescrever)
CREATE POLICY "avatars_authenticated_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
