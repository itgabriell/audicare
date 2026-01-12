-- Migration: 020_final_fix_profile_policies.sql
-- Description: LIMPA TODAS AS POLÍTICAS E RECRIA CORRETAMENTE

-- 1. Remover TODAS as políticas existentes (antigas e novas)
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
DROP POLICY IF EXISTS "profile_admin_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_admin_manage_all" ON public.profiles;
DROP POLICY IF EXISTS "profile_clinic_read" ON public.profiles;
DROP POLICY IF EXISTS "profile_clinic_manage" ON public.profiles;

-- 2. Garantir que a função is_admin_user existe e funciona
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  BEGIN
    -- Tenta buscar o role do usuário atual
    -- SECURITY DEFINER permite bypassar RLS
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Se houver erro, retorna false
    RETURN false;
  END;
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon;

-- 3. Recriar políticas na ordem correta (mais permissivas primeiro)

-- POLÍTICA 1: CRÍTICA - Usuário SEMPRE pode ler seu próprio perfil
-- Esta deve ter prioridade máxima
CREATE POLICY "profile_own_read"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- POLÍTICA 2: Usuário pode atualizar seu próprio perfil
CREATE POLICY "profile_own_update"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- POLÍTICA 3: Usuário pode inserir seu próprio perfil (para registro)
CREATE POLICY "profile_own_insert"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- POLÍTICA 4: Admins podem ler todos os perfis
CREATE POLICY "profile_admin_read_all"
ON public.profiles FOR SELECT
USING (public.is_admin_user());

-- POLÍTICA 5: Admins podem gerenciar todos os perfis
CREATE POLICY "profile_admin_manage_all"
ON public.profiles FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- POLÍTICA 6: Membros podem ler perfis da mesma clínica
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
'CRÍTICA: Usuários sempre podem ler seu próprio perfil. Esta política tem prioridade máxima.';

COMMENT ON POLICY "profile_admin_read_all" ON public.profiles IS 
'Administradores podem ler todos os perfis.';

COMMENT ON POLICY "profile_admin_manage_all" ON public.profiles IS 
'Administradores podem gerenciar (criar, atualizar, deletar) todos os perfis.';

