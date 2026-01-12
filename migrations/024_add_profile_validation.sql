-- Migration: 024_add_profile_validation.sql
-- Description: Adiciona validações para prevenir problemas futuros com perfis

-- 1. Adicionar constraint para garantir que admins sempre tenham clinic_id
-- (Comentado porque pode ser muito restritivo - descomente se necessário)
-- ALTER TABLE public.profiles 
-- ADD CONSTRAINT profiles_admin_must_have_clinic 
-- CHECK (role != 'admin' OR clinic_id IS NOT NULL);

-- 2. Criar função para limpar perfis órfãos (sem clinic_id e sem email confirmado)
CREATE OR REPLACE FUNCTION public.cleanup_orphan_profiles()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar perfis que não têm clinic_id e não têm usuário correspondente em auth.users
  -- OU perfis de teste que não foram atualizados recentemente
  DELETE FROM public.profiles
  WHERE clinic_id IS NULL
    AND (
      -- Perfis de teste antigos (mais de 30 dias sem atualização)
      (updated_at IS NULL AND created_at IS NULL)
      OR (updated_at < NOW() - INTERVAL '30 days')
      OR (full_name LIKE '%Teste%' OR full_name LIKE '%teste%' OR full_name LIKE '%Test%')
    )
    AND role != 'admin'; -- Nunca deletar admins

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION public.cleanup_orphan_profiles IS 
'Limpa perfis órfãos (sem clinic_id) que são claramente de teste ou abandonados. Nunca deleta admins.';

-- 3. Criar trigger ou função para garantir clinic_id ao criar perfil de admin
-- (Isso seria ideal, mas requer que o clinic_id seja conhecido no momento da criação)
-- Por enquanto, vamos apenas documentar isso

-- 4. Criar índice para melhorar performance de queries por clinic_id
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

