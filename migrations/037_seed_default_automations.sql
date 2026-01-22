-- Description: Seeds default automations for clinics that don't have any
-- Date: 2026-01-22

-- Function to create default automations for a clinic
CREATE OR REPLACE FUNCTION create_default_automations(clinic_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Only create if clinic doesn't have automations yet
  IF NOT EXISTS (SELECT 1 FROM automations WHERE clinic_id = clinic_uuid) THEN

    -- Birthday automation
    INSERT INTO automations (
      clinic_id, name, description, trigger_type, trigger_config,
      action_type, action_config, status
    ) VALUES (
      clinic_uuid,
      'birthday',
      'Envia mensagem de parabéns automaticamente todo dia às 9:00 para pacientes que fazem aniversário',
      'scheduled',
      '{"schedule": "0 9 * * *"}'::jsonb,
      'whatsapp_message',
      '{"message": "🎉 Feliz Aniversário! 🎂\n\nQue seu dia seja repleto de alegria e saúde! Que tal agendar uma consulta para verificar seus aparelhos?\n\nAtenciosamente,\nClínica Audicare"}'::jsonb,
      'active'
    );

    -- Appointment confirmation automation
    INSERT INTO automations (
      clinic_id, name, description, trigger_type, trigger_config,
      action_type, action_config, status
    ) VALUES (
      clinic_uuid,
      'appointment_confirmation',
      'Envia lembretes de confirmação antes das consultas agendadas',
      'scheduled',
      '{"schedule": "0 8 * * *", "days_ahead": 2}'::jsonb,
      'whatsapp_message',
      '{"message": "Olá {{nome}}! 👋\n\nLembrando que sua consulta está agendada para {{data}} às {{hora}}.\n\nPor favor, responda SIM para confirmar sua presença ou NOSSO contato para reagendar.\n\nAtenciosamente,\nClínica Audicare"}'::jsonb,
      'active'
    );

    -- Welcome checkin automation
    INSERT INTO automations (
      clinic_id, name, description, trigger_type, trigger_config,
      action_type, action_config, status
    ) VALUES (
      clinic_uuid,
      'welcome_checkin',
      'Envia mensagem de boas-vindas quando o status da consulta muda para \"Chegou\"',
      'event',
      '{"appointment_status": "arrived"}'::jsonb,
      'whatsapp_message',
      '{"message": "Olá {{nome}}! 👋\n\nVimos que você chegou para sua consulta. Estamos preparando tudo para te atender!\n\nSe precisar de algo, é só falar.\n\nAtenciosamente,\nClínica Audicare"}'::jsonb,
      'active'
    );

    -- Goodbye checkout automation
    INSERT INTO automations (
      clinic_id, name, description, trigger_type, trigger_config,
      action_type, action_config, status
    ) VALUES (
      clinic_uuid,
      'goodbye_checkout',
      'Envia mensagem de despedida quando o status da consulta muda para \"Finalizado\"',
      'event',
      '{"appointment_status": "completed"}'::jsonb,
      'whatsapp_message',
      '{"message": "Olá {{nome}}! 👋\n\nObrigado por confiar na Clínica Audicare!\n\nEsperamos te ver novamente em breve. Cuide-se bem! 💙\n\nAtenciosamente,\nClínica Audicare"}'::jsonb,
      'active'
    );

    RAISE NOTICE 'Default automations created for clinic %', clinic_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create default automations for all existing clinics
DO $$
DECLARE
    clinic_record RECORD;
BEGIN
    FOR clinic_record IN SELECT id FROM clinics LOOP
        PERFORM create_default_automations(clinic_record.id);
    END LOOP;
END $$;

-- Create a trigger to automatically create default automations for new clinics
CREATE OR REPLACE FUNCTION trigger_create_default_automations()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_automations(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on clinics table
DROP TRIGGER IF EXISTS trigger_create_default_automations_on_clinic_insert ON clinics;
CREATE TRIGGER trigger_create_default_automations_on_clinic_insert
    AFTER INSERT ON clinics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_automations();
