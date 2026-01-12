-- Migration: 016_fix_profiles_rls_for_admins.sql
-- Description: Atualiza políticas RLS da tabela profiles para permitir que admins gerenciem usuários de qualquer clínica

-- Habilitar RLS na tabela profiles (caso não esteja habilitado)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Members can manage profiles from their own clinics" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from their own clinic" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Criar função helper para verificar se o usuário é admin (mais eficiente)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para ADMINS: podem gerenciar TODOS os perfis (qualquer clínica)
-- Esta política tem prioridade sobre as outras
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Política para usuários verem seu próprio perfil (sempre permitido)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Política para outros roles: podem gerenciar perfis apenas da mesma clínica
-- Só aplica se não for admin
CREATE POLICY "Members can manage profiles from their own clinics"
ON public.profiles FOR ALL
USING (
  NOT public.is_admin_user()
  AND (
    -- Permite gerenciar se for da mesma clínica
    (clinic_id IS NOT NULL 
     AND EXISTS (
       SELECT 1 
       FROM public.profiles p
       WHERE p.id = auth.uid()
       AND p.clinic_id = profiles.clinic_id
     ))
    -- Ou permite que usuários vejam seu próprio perfil
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
COMMENT ON POLICY "Admins can manage all profiles" ON public.profiles IS 
'Administradores podem gerenciar (criar, ler, atualizar, deletar) perfis de qualquer clínica.';

COMMENT ON POLICY "Members can manage profiles from their own clinics" ON public.profiles IS 
'Usuários não-admin podem gerenciar perfis apenas da mesma clínica, ou visualizar seu próprio perfil.';

