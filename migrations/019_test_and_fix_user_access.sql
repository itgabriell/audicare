-- Migration: 019_test_and_fix_user_access.sql
-- Description: Testa e corrige acesso do usuário ao seu próprio perfil

-- IMPORTANTE: Execute este script no Supabase SQL Editor para diagnosticar

-- 1. Verificar se o usuário existe em auth.users e se tem perfil correspondente
-- (Substitua o ID pelo seu user ID do erro: 12458a68-f76c-477f-aab5-edd56be6cc65)
-- OU use auth.uid() se estiver logado no Supabase

-- Verificar usuário em auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users 
WHERE id = '12458a68-f76c-477f-aab5-edd56be6cc65';

-- Verificar se o perfil existe em profiles
SELECT 
  id,
  full_name,
  role,
  clinic_id,
  phone,
  avatar_url,
  updated_at,
  specialty
FROM public.profiles 
WHERE id = '12458a68-f76c-477f-aab5-edd56be6cc65';

-- Verificar se há trigger que cria perfil automaticamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- 2. Verificar quais políticas existem
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 3. Desabilitar RLS temporariamente (APENAS PARA TESTE)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Se o perfil não existe, criar um básico
-- INSERT INTO public.profiles (id, full_name, role, clinic_id)
-- VALUES ('12458a68-f76c-477f-aab5-edd56be6cc65', 'Seu Nome', 'admin', NULL)
-- ON CONFLICT (id) DO NOTHING;

-- 5. Recriar políticas de forma mais simples e direta
-- Execute o script 018_emergency_fix_profile_access.sql após verificar os resultados acima

