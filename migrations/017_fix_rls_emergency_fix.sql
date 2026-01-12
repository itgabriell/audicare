-- Migration: 017_fix_rls_emergency_fix.sql
-- Description: CORREÇÃO DE EMERGÊNCIA - Garante que admins e usuários possam acessar seus dados

-- IMPORTANTE: Esta migração desabilita temporariamente o RLS para garantir acesso
-- Depois recria as políticas de forma segura

-- 1. Desabilitar RLS temporariamente para permitir correção
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Members can manage profiles from their own clinics" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can always view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can manage profiles from their own clinic" ON public.profiles;

-- 3. Função helper melhorada - usa bypass de RLS
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Busca direto na tabela, bypassando RLS usando SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários sempre podem ver seu próprio perfil (CRÍTICO)
CREATE POLICY "Users can always view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Política 2: Usuários sempre podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Política 3: Admins podem fazer TUDO com TODOS os perfis
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (
  public.is_admin_user()
  OR id = auth.uid() -- Fallback: usuário sempre pode ver/editar o próprio
)
WITH CHECK (
  public.is_admin_user()
  OR id = auth.uid() -- Fallback: usuário sempre pode editar o próprio
);

-- Política 4: Membros podem ver e gerenciar perfis da mesma clínica
CREATE POLICY "Members can manage profiles from their own clinic"
ON public.profiles FOR ALL
USING (
  NOT public.is_admin_user() -- Só aplica se não for admin
  AND (
    -- Permite se for da mesma clínica
    (clinic_id IS NOT NULL 
     AND EXISTS (
       SELECT 1 
       FROM public.profiles p
       WHERE p.id = auth.uid()
       AND p.clinic_id = profiles.clinic_id
     ))
    -- OU se for o próprio perfil (redundante mas seguro)
    OR id = auth.uid()
  )
)
WITH CHECK (
  NOT public.is_admin_user()
  AND (
    (clinic_id IS NOT NULL 
     AND EXISTS (
       SELECT 1 
       FROM public.profiles p
       WHERE p.id = auth.uid()
       AND p.clinic_id = profiles.clinic_id
     ))
    OR id = auth.uid()
  )
);

-- Comentários
COMMENT ON POLICY "Users can always view own profile" ON public.profiles IS 
'POLÍTICA CRÍTICA: Usuários sempre podem ver seu próprio perfil, independente de outras políticas.';

COMMENT ON POLICY "Admins can manage all profiles" ON public.profiles IS 
'Administradores podem gerenciar todos os perfis. Também permite que qualquer usuário veja/edite seu próprio perfil como fallback.';

COMMENT ON POLICY "Members can manage profiles from their own clinic" ON public.profiles IS 
'Usuários não-admin podem gerenciar perfis apenas da mesma clínica.';

