-- Migration: 003_create_indexes.sql
-- Description: Creates indexes on foreign keys and frequently queried columns to improve performance.

-- Índices são cruciais para acelerar a performance de consultas (SELECT), especialmente
-- em tabelas que crescerão muito, como `messages` e `conversations`.

-- 1. Tabela `channels`
CREATE INDEX IF NOT EXISTS idx_channels_clinic_id ON public.channels(clinic_id);

-- 2. Tabela `contacts`
CREATE INDEX IF NOT EXISTS idx_contacts_clinic_id ON public.contacts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_contacts_channel_id ON public.contacts(channel_id);
CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON public.contacts(external_id);

-- 3. Tabela `contact_patients`
CREATE INDEX IF NOT EXISTS idx_contact_patients_contact_id ON public.contact_patients(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_patients_patient_id ON public.contact_patients(patient_id);

-- 4. Tabela `conversations`
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_id ON public.conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON public.conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 5. Tabela `messages`
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);

-- 6. Tabela `message_attachments`
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);

-- 7. Tabela `message_templates`
CREATE INDEX IF NOT EXISTS idx_message_templates_clinic_id ON public.message_templates(clinic_id);

-- 8. Tabela `appointments`
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_id ON public.appointments(contact_id);

-- 9. Tabela `campaigns`
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic_id ON public.campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_message_template_id ON public.campaigns(message_template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_channel_id ON public.campaigns(channel_id);

-- 10. Tabela `campaign_recipients`
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON public.campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);


-- ROLLBACK SCRIPT
-- Para reverter esta migração, execute o seguinte script:
/*
DROP INDEX IF EXISTS idx_channels_clinic_id;
DROP INDEX IF EXISTS idx_contacts_clinic_id;
DROP INDEX IF EXISTS idx_contacts_channel_id;
DROP INDEX IF EXISTS idx_contacts_external_id;
DROP INDEX IF EXISTS idx_contact_patients_contact_id;
DROP INDEX IF EXISTS idx_contact_patients_patient_id;
DROP INDEX IF EXISTS idx_conversations_clinic_id;
DROP INDEX IF EXISTS idx_conversations_contact_id;
DROP INDEX IF EXISTS idx_conversations_channel_id;
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_last_message_at;
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_sender_type;
DROP INDEX IF EXISTS idx_message_attachments_message_id;
DROP INDEX IF EXISTS idx_message_templates_clinic_id;
DROP INDEX IF EXISTS idx_appointments_clinic_id;
DROP INDEX IF EXISTS idx_appointments_patient_id;
DROP INDEX IF EXISTS idx_appointments_contact_id;
DROP INDEX IF EXISTS idx_campaigns_clinic_id;
DROP INDEX IF EXISTS idx_campaigns_message_template_id;
DROP INDEX IF EXISTS idx_campaigns_channel_id;
DROP INDEX IF EXISTS idx_campaign_recipients_campaign_id;
DROP INDEX IF EXISTS idx_campaign_recipients_contact_id;
DROP INDEX IF EXISTS idx_campaign_recipients_status;
*/