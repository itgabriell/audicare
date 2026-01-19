-- FIX: Corrigir função is_member_of_clinic para resolver erro 406 na tabela contacts
-- Execute este SQL no painel do Supabase > SQL Editor

-- A função já existe e é usada por várias políticas RLS, então vamos recriá-la diretamente
-- CREATE OR REPLACE vai substituir a função existente mantendo as dependências
CREATE OR REPLACE FUNCTION public.is_member_of_clinic(p_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é membro da clínica especificada
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND clinic_id = p_clinic_id
  );
END;
$$;

-- Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION public.is_member_of_clinic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_clinic(UUID) TO service_role;

-- Verificar se a função foi criada corretamente
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'is_member_of_clinic';

-- Testar a função (opcional - só funciona se houver usuário logado)
-- SELECT public.is_member_of_clinic('b82d5019-c04c-47f6-b9f9-673ca736815b'::uuid);
