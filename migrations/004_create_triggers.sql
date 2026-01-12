-- Migration: 004_create_triggers.sql
-- Description: Creates a trigger function to automatically update the `updated_at` timestamp on row modifications.

-- 1. Criação da Função do Trigger
-- Esta função será reutilizada por todos os triggers. Ela define o valor da coluna
-- `updated_at` para a hora atual sempre que uma linha for atualizada.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Aplicação dos Triggers
-- Um trigger é adicionado a cada tabela que possui a coluna `updated_at`.

-- Tabela `channels`
CREATE TRIGGER on_channels_update
BEFORE UPDATE ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabela `contacts`
CREATE TRIGGER on_contacts_update
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabela `conversations`
CREATE TRIGGER on_conversations_update
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabela `messages`
CREATE TRIGGER on_messages_update
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabela `message_templates`
CREATE TRIGGER on_message_templates_update
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabela `appointments`
CREATE TRIGGER on_appointments_update
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Tabela `campaigns`
CREATE TRIGGER on_campaigns_update
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- ROLLBACK SCRIPT
-- Para reverter esta migração, execute o seguinte script:
/*
DROP TRIGGER IF EXISTS on_channels_update ON public.channels;
DROP TRIGGER IF EXISTS on_contacts_update ON public.contacts;
DROP TRIGGER IF EXISTS on_conversations_update ON public.conversations;
DROP TRIGGER IF EXISTS on_messages_update ON public.messages;
DROP TRIGGER IF EXISTS on_message_templates_update ON public.message_templates;
DROP TRIGGER IF EXISTS on_appointments_update ON public.appointments;
DROP TRIGGER IF EXISTS on_campaigns_update ON public.campaigns;

DROP FUNCTION IF EXISTS public.handle_updated_at();
*/