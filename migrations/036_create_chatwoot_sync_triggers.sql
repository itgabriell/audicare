-- Migração: Sistema de Sincronização Chatwoot
-- Descrição: Triggers para sincronização automática entre Audicare e Chatwoot

-- ===========================================
-- 1. TRIGGER PARA PACIENTES
-- ===========================================

-- Função para notificar mudanças em pacientes
CREATE OR REPLACE FUNCTION notify_patient_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Construir payload com dados do paciente
  payload := json_build_object(
    'event_type', TG_OP,
    'patient_id', COALESCE(NEW.id, OLD.id),
    'patient_data', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'changed_fields', CASE
      WHEN TG_OP = 'UPDATE' THEN (
        SELECT json_object_agg(key, value)
        FROM json_each_text(row_to_json(NEW)) a
        JOIN json_each_text(row_to_json(OLD)) b ON a.key = b.key
        WHERE a.value IS DISTINCT FROM b.value
      )
      ELSE NULL
    END,
    'timestamp', extract(epoch from now())
  );

  -- Notificar via webhook do Supabase
  PERFORM pg_notify('patient_changes', payload::text);

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger para pacientes
DROP TRIGGER IF EXISTS patient_changes_trigger ON patients;
CREATE TRIGGER patient_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION notify_patient_changes();

-- ===========================================
-- 2. TRIGGER PARA TELEFONES DE PACIENTES
-- ===========================================

-- Função para notificar mudanças em telefones
CREATE OR REPLACE FUNCTION notify_patient_phone_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  payload := json_build_object(
    'event_type', TG_OP,
    'phone_id', COALESCE(NEW.id, OLD.id),
    'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
    'phone_data', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'timestamp', extract(epoch from now())
  );

  PERFORM pg_notify('patient_phone_changes', payload::text);

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger para telefones de pacientes
DROP TRIGGER IF EXISTS patient_phone_changes_trigger ON patient_phones;
CREATE TRIGGER patient_phone_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patient_phones
  FOR EACH ROW EXECUTE FUNCTION notify_patient_phone_changes();

-- ===========================================
-- NOTA: Endereços estão na tabela patients
-- ===========================================

-- Os campos de endereço (street, number, neighborhood, city, state, zip_code, complement)
-- estão diretamente na tabela patients, não em uma tabela separada patient_addresses.
-- Por isso, as mudanças de endereço serão detectadas pelo trigger de pacientes.

-- ===========================================
-- 4. TABELA DE LOG DE SINCRONIZAÇÃO
-- ===========================================

-- Tabela para rastrear sincronizações
CREATE TABLE IF NOT EXISTS chatwoot_sync_log (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'patient_sync', 'contact_sync', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'patient', 'contact', 'phone', 'address'
  entity_id INTEGER NOT NULL,
  chatwoot_contact_id INTEGER,
  sync_direction VARCHAR(20) NOT NULL, -- 'audicare_to_chatwoot', 'chatwoot_to_audicare'
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chatwoot_sync_log_entity ON chatwoot_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_sync_log_status ON chatwoot_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_chatwoot_sync_log_created_at ON chatwoot_sync_log(created_at);

-- ===========================================
-- 5. FUNÇÃO RPC PARA BUSCAR PACIENTE POR TELEFONE
-- ===========================================

-- Remover função existente se ela tiver assinatura diferente
DROP FUNCTION IF EXISTS find_patient_by_phone(TEXT);

-- Função para buscar paciente por telefone (usada pela API)
CREATE FUNCTION find_patient_by_phone(phone_number TEXT)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Primeiro, tentar encontrar pelo telefone primário
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.phone,
    p.email,
    p.birth_date,
    p.created_at,
    p.updated_at
  FROM patients p
  WHERE p.phone = phone_number
     OR p.phone ILIKE '%' || phone_number || '%'
  LIMIT 1;

  -- Se não encontrou, tentar pelos telefones secundários
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      p.id,
      p.name,
      p.phone,
      p.email,
      p.birth_date,
      p.created_at,
      p.updated_at
    FROM patients p
    JOIN patient_phones pp ON p.id = pp.patient_id
    WHERE pp.phone = phone_number
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 6. CONFIGURAÇÃO DE RLS
-- ===========================================

-- Políticas RLS para chatwoot_sync_log
ALTER TABLE chatwoot_sync_log ENABLE ROW LEVEL SECURITY;

-- Política para administradores
CREATE POLICY "Administradores podem gerenciar logs de sincronização"
ON chatwoot_sync_log
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ===========================================
-- 7. FUNÇÃO PARA LIMPAR LOGS ANTIGOS
-- ===========================================

-- Função para limpar logs de sincronização antigos (manter últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chatwoot_sync_log
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- LOG DA MIGRAÇÃO
-- ===========================================

INSERT INTO chatwoot_sync_log (
  event_type,
  entity_type,
  entity_id,
  sync_direction,
  sync_status,
  metadata
) VALUES (
  'migration_applied',
  'system',
  0,
  'system',
  'success',
  json_build_object(
    'migration', '036_create_chatwoot_sync_triggers.sql',
    'description', 'Sistema de sincronização Chatwoot implementado',
    'features', json_build_array(
      'Triggers para mudanças em pacientes',
      'Triggers para mudanças em telefones',
      'Triggers para mudanças em endereços',
      'Tabela de log de sincronização',
      'Função RPC find_patient_by_phone',
      'Políticas RLS para logs',
      'Função de limpeza de logs antigos'
    )
  )
);
