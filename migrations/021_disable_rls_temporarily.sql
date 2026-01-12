-- Migration: 021_disable_rls_temporarily.sql
-- Description: DESABILITA RLS TEMPORARIAMENTE PARA RESTAURAR ACESSO
-- ATENÇÃO: Esta é uma solução temporária para emergência

-- Desabilitar RLS completamente na tabela profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- IMPORTANTE: Depois que o sistema voltar a funcionar, precisaremos recriar as políticas corretas
-- Execute a migração 022_reenable_rls_safely.sql quando tudo estiver funcionando

