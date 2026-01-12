-- Migration: 018_emergency_fix_profile_access.sql
-- Description: CORREÇÃO DE EMERGÊNCIA - Garante acesso imediato ao próprio perfil

-- Primeiro, vamos desabilitar RLS temporariamente para garantir que todos possam acessar
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Members can manage profiles from their own clinics" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can always view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can manage profiles from their own clinic" ON public.profiles;
DROP POLICY IF EXISTS "profile_own_read" ON public.profiles;
DROP POLICY IF EXISTS "profile_own_update" ON public.profiles;
DROP POLICY IF EXISTS "profile_admin_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_admin_manage_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_clinic_read" ON public.profiles;
DROP POLICY IF EXISTS "profile_clinic_manage" ON public.profiles;

-- Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: CRÍTICA - Usuário SEMPRE pode ver seu próprio perfil
-- Esta deve ser a primeira e mais permissiva
CREATE POLICY "profile_own_read"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- POLÍTICA 2: Usuário pode atualizar seu próprio perfil
CREATE POLICY "profile_own_update"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- POLÍTICA 3: Verificar se é admin usando uma abordagem mais simples
-- Primeiro vamos criar uma função que não depende de RLS
-- IMPORTANTE: Esta função precisa bypassar RLS completamente
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Busca o role do usuário atual
  -- Usa SECURITY DEFINER para bypassar RLS completamente
  -- E também faz um SELECT direto sem passar pelas políticas
  BEGIN
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Se houver qualquer erro, retorna false
    RETURN false;
  END;
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Garantir que a função tem as permissões corretas
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- POLÍTICA 4: Admins podem ver todos os perfis
CREATE POLICY "profile_admin_read_all"
ON public.profiles FOR SELECT
USING (public.is_admin_user());

-- POLÍTICA 5: Admins podem gerenciar todos os perfis
CREATE POLICY "profile_admin_manage_all"
ON public.profiles FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- POLÍTICA 6: Membros podem ver perfis da mesma clínica
CREATE POLICY "profile_clinic_read"
ON public.profiles FOR SELECT
USING (
  NOT public.is_admin_user()
  AND clinic_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.clinic_id = profiles.clinic_id
  )
);

-- POLÍTICA 7: Membros podem gerenciar perfis da mesma clínica
CREATE POLICY "profile_clinic_manage"
ON public.profiles FOR ALL
USING (
  NOT public.is_admin_user()
  AND clinic_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.clinic_id = profiles.clinic_id
  )
)
WITH CHECK (
  NOT public.is_admin_user()
  AND clinic_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.clinic_id = profiles.clinic_id
  )
);

-- Comentários
COMMENT ON POLICY "profile_own_read" ON public.profiles IS 
'POLÍTICA CRÍTICA: Usuários sempre podem ler seu próprio perfil. Deve ter prioridade sobre outras políticas.';

COMMENT ON POLICY "profile_admin_read_all" ON public.profiles IS 
'Administradores podem ler todos os perfis.';

COMMENT ON POLICY "profile_admin_manage_all" ON public.profiles IS 
'Administradores podem gerenciar (criar, atualizar, deletar) todos os perfis.';

