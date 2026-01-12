-- Migration: 022_reenable_rls_safely.sql
-- Description: REABILITA RLS COM POLÍTICAS SIMPLES E FUNCIONAIS
-- Execute esta migração DEPOIS que o sistema estiver funcionando

-- 1. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Members can manage profiles from their own clinics" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can always view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can manage profiles from their own clinic" ON public.profiles;
DROP POLICY IF EXISTS "profile_own_read" ON public.profiles;
DROP POLICY IF EXISTS "profile_own_update" ON public.profiles;
DROP POLICY IF EXISTS "profile_own_insert" ON public.profiles;
DROP POLICY IF EXISTS "profile_admin_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_admin_manage_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_clinic_read" ON public.profiles;
DROP POLICY IF EXISTS "profile_clinic_manage" ON public.profiles;

-- 2. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas SIMPLES sem dependências complexas

-- POLÍTICA 1: CRÍTICA - Usuário SEMPRE pode ler seu próprio perfil
CREATE POLICY "profile_own_read"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- POLÍTICA 2: Usuário pode atualizar seu próprio perfil
CREATE POLICY "profile_own_update"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- POLÍTICA 3: Usuário pode inserir seu próprio perfil
CREATE POLICY "profile_own_insert"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- POLÍTICA 4: Todos podem ler todos os perfis (temporário, ajustar depois)
-- ATENÇÃO: Remova esta política quando tiver certeza de que as outras funcionam
CREATE POLICY "profile_read_all"
ON public.profiles FOR SELECT
USING (true);

-- Comentários
COMMENT ON POLICY "profile_own_read" ON public.profiles IS 
'Usuários sempre podem ler seu próprio perfil.';

COMMENT ON POLICY "profile_read_all" ON public.profiles IS 
'TEMPORÁRIA: Permite leitura de todos os perfis. Remover quando outras políticas estiverem funcionando.';

