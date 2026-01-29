DO $$
DECLARE
    v_clinic_id uuid;
    v_user_id uuid;
BEGIN
    -- Tentar obter um ID de clínica válido
    SELECT id INTO v_clinic_id FROM clinics LIMIT 1;
    
    -- Tentar obter um ID de usuário válido (se possível)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- Inserir automação se encontramos uma clínica, evitando duplicatas pelo nome
    IF v_clinic_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM automations WHERE name = 'Confirmação de Agendamento (WhatsApp)' AND clinic_id = v_clinic_id) THEN
            INSERT INTO automations (
                clinic_id,
                name,
                description,
                trigger_type,
                trigger_config,
                action_type,
                action_config,
                status,
                created_by
            ) VALUES (
                v_clinic_id,
                'Confirmação de Agendamento (WhatsApp)',
                'Envia mensagem automática via Chatwoot quando um agendamento é criado.',
                'event',
                '{"event_type": "appointment_created"}',
                'whatsapp_message',
                '{"message_template": "Olá {{nome}}, seu agendamento foi realizado com sucesso! Aguardamos você aqui, dia {{data}} às {{hora}}.\n\nLembre-se, Estamos localizados na Quadra 714/914 sul, Edifício Talento - sala 434 - Asa Sul.\n\nQualquer dúvida, pode nos chamar! 🦻"}',
                'active',
                v_user_id
            );
        END IF;
    END IF;
END $$;
