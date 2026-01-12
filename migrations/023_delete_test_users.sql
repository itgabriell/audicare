-- Migration: 023_delete_test_users.sql
-- Description: Remove usuários de teste que não têm clinic_id

-- Deletar usuários de teste
DELETE FROM public.profiles 
WHERE full_name = 'Usuário Teste CLI'
AND clinic_id IS NULL;

-- Verificar se foram deletados
SELECT id, full_name, role, clinic_id 
FROM public.profiles 
ORDER BY updated_at DESC;

