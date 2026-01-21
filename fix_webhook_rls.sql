-- =====================================================
-- FIX PARA WEBHOOK CHATWOOT SYNC - RLS BYPASS
-- =====================================================

-- Desabilitar temporariamente o trigger problemático durante a inserção
-- CREATE OR REPLACE FUNCTION create_patient_from_chatwoot(
--   p_name TEXT,
--   p_phone TEXT,
--   p_clinic_id UUID,
--   p_contact_id TEXT DEFAULT NULL
-- ) RETURNS UUID AS $$
-- DECLARE
--   new_patient_id UUID;
--   clean_phone TEXT;
-- BEGIN
--   -- Limpar telefone (remover caracteres não numéricos)
--   clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

--   -- Verificar se paciente já existe com este telefone
--   SELECT id INTO new_patient_id
--   FROM patients
--   WHERE clinic_id = p_clinic_id
--     AND phone = clean_phone;

--   -- Se já existe, retornar o ID
--   IF new_patient_id IS NOT NULL THEN
--     RETURN new_patient_id;
--   END IF;

--   -- Criar novo paciente SEM disparar triggers
--   INSERT INTO patients (
--     name,
--     phone,
--     clinic_id,
--     notes,
--     created_at,
--     updated_at
--   ) VALUES (
--     COALESCE(p_name, 'Contato WhatsApp'),
--     clean_phone,
--     p_clinic_id,
--     CASE
--       WHEN p_contact_id IS NOT NULL THEN 'Criado via Chatwoot (ID: ' || p_contact_id || ')'
--       ELSE 'Criado via Chatwoot'
--     END,
--     NOW(),
--     NOW()
--   )
--   RETURNING id INTO new_patient_id;

--   RETURN new_patient_id;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SOLUÇÃO DEFINITIVA: Insert direto com tratamento de erro
-- =====================================================

CREATE OR REPLACE FUNCTION create_patient_from_chatwoot(
  p_name TEXT,
  p_phone TEXT,
  p_clinic_id UUID,
  p_contact_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_patient_id UUID;
  clean_phone TEXT;
BEGIN
  -- Limpar telefone (remover caracteres não numéricos)
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Verificar se paciente já existe com este telefone
  SELECT id INTO new_patient_id
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND phone = clean_phone;

  -- Se já existe, retornar o ID
  IF new_patient_id IS NOT NULL THEN
    RETURN new_patient_id;
  END IF;

  -- Tentar inserir paciente diretamente
  -- Se houver erro de RLS, será ignorado devido ao SECURITY DEFINER
  INSERT INTO patients (
    name,
    phone,
    clinic_id,
    notes,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_name, 'Contato WhatsApp'),
    clean_phone,
    p_clinic_id,
    CASE
      WHEN p_contact_id IS NOT NULL THEN 'Criado via Chatwoot (ID: ' || p_contact_id || ')'
      ELSE 'Criado via Chatwoot'
    END,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_patient_id;

  RETURN new_patient_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debug
    RAISE NOTICE 'Erro ao criar paciente via webhook: %', SQLERRM;

    -- Tentar buscar novamente (pode ter sido criado por outra transação)
    SELECT id INTO new_patient_id
    FROM patients
    WHERE clinic_id = p_clinic_id
      AND phone = clean_phone;

    IF new_patient_id IS NOT NULL THEN
      RETURN new_patient_id;
    END IF;

    -- Se ainda não encontrou, relançar o erro
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION create_patient_from_chatwoot(TEXT, TEXT, UUID, TEXT) TO authenticated;

-- =====================================================
-- TESTE DA FUNÇÃO
-- =====================================================

-- Para testar, execute:
-- SELECT create_patient_from_chatwoot(
--   'João Silva',
--   '+5511999999999',
--   'b82d5019-c04c-47f6-b9f9-673ca736815b',
--   '12345'
-- );

-- =====================================================
-- DIAGNÓSTICO DE TRIGGERS
-- =====================================================

-- Execute primeiro para ver os triggers existentes:
-- SELECT
--     event_object_table,
--     trigger_name,
--     event_manipulation,
--     action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'patients';

-- =====================================================
-- LOG PARA DEBUG
-- =====================================================

-- Verificar se a função foi criada
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_name = 'create_patient_from_chatwoot';
