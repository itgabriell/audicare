-- Migration: 001_create_multichannel_tables.sql
-- Description: Creates and aligns the core tables for the multichannel feature.
-- CUIDADO: Este script apaga tabelas existentes para garantir uma estrutura limpa e alinhada ao novo plano.

-- Drop existing tables in reverse order of dependency to avoid foreign key conflicts.
DROP TABLE IF EXISTS public.conversation_tags CASCADE;
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.contact_relationships CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
-- The old appointments table will be dropped and recreated to include clinic_id
DROP TABLE IF EXISTS public.appointments CASCADE;
-- The patients table will be altered, not dropped.

-- Drop old ENUM types if they exist to recreate them cleanly
DROP TYPE IF EXISTS public.channel_type;
DROP TYPE IF EXISTS public.conversation_status_type;
DROP TYPE IF EXISTS public.message_status_type;
DROP TYPE IF EXISTS public.sender_type;
DROP TYPE IF EXISTS public.related_entity_type;
DROP TYPE IF EXISTS public.appointment_status;
DROP TYPE IF EXISTS public.contact_status;

-- 1. Definição de Tipos ENUM
-- Estes tipos garantem a consistência dos dados para campos de status e tipo.
CREATE TYPE public.channel_type AS ENUM ('whatsapp', 'instagram', 'facebook', 'telegram', 'email');
CREATE TYPE public.conversation_status_type AS ENUM ('active', 'archived', 'closed');
CREATE TYPE public.message_status_type AS ENUM ('sending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE public.sender_type AS ENUM ('contact', 'user', 'system');
CREATE TYPE public.contact_status AS ENUM ('active', 'archived', 'blocked');
CREATE TYPE public.related_entity_type AS ENUM ('patient', 'lead');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'canceled', 'no-show');

-- 2. Alteração da Tabela `patients`
-- Adiciona a coluna clinic_id se ela não existir.
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinic_id UUID;
-- Adiciona a referência de chave estrangeira.
-- Note: Se já houver dados em `patients`, a adição da constraint pode falhar se `clinic_id` for NULL e a FK exigir um valor.
-- Adicionamos um `DEFAULT` temporário para contornar isso em ambientes de dev. Em produção, uma migração de dados seria necessária.
-- Por segurança, estamos apenas adicionando a coluna aqui. A constraint será adicionada depois.
COMMENT ON COLUMN public.patients.clinic_id IS 'Foreign key to the clinics table, for multi-tenancy.';

-- 3. Tabela `contacts`
-- Armazena informações de contatos externos. Agora inclui channel_type.
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    phone TEXT, -- Mantido para compatibilidade com WhatsApp
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    status public.contact_status NOT NULL DEFAULT 'active',
    channel_type public.channel_type NOT NULL DEFAULT 'whatsapp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id, phone) -- Garante que um número de telefone seja único por clínica
);
COMMENT ON TABLE public.contacts IS 'Stores external contacts, such as customers or leads.';

-- 4. Tabela `conversations`
-- Agrupa mensagens de um contato.
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status public.conversation_status_type NOT NULL DEFAULT 'active',
    last_message_at TIMESTAMPTZ,
    unread_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.conversations IS 'Groups messages for a specific contact.';

-- 5. Tabela `messages`
-- Armazena cada mensagem individual de uma conversa.
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    sender_type public.sender_type NOT NULL,
    sender_id UUID, -- NULL se sender_type='contact', referencia public.profiles se 'user'
    content TEXT,
    status public.message_status_type NOT NULL DEFAULT 'sending',
    media_url TEXT,
    message_type TEXT, -- ex: text, image, audio
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.messages IS 'Stores individual messages within a conversation.';

-- 6. Tabela `appointments`
-- Recriada para garantir a referência correta a `clinic_id`.
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    scheduled_by UUID REFERENCES public.profiles(id),
    appointment_date TIMESTAMPTZ NOT NULL,
    appointment_type TEXT,
    notes TEXT,
    status public.appointment_status NOT NULL DEFAULT 'scheduled',
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.appointments IS 'Manages patient appointments, now with clinic_id for RLS.';