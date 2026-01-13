-- Migration: Adicionar campo lead_status à tabela conversations
-- Adiciona funcionalidade de CRM para controlar status dos leads

-- Adicionar coluna lead_status à tabela conversations se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'conversations'
        AND column_name = 'lead_status'
    ) THEN
        ALTER TABLE public.conversations
        ADD COLUMN lead_status TEXT DEFAULT 'novo'
        CHECK (lead_status IN ('novo', 'atendendo', 'agendado', 'finalizado'));
    END IF;
END $$;

-- Criar índice para otimizar consultas por status
CREATE INDEX IF NOT EXISTS idx_conversations_lead_status ON public.conversations(lead_status);

-- Comentário na coluna
COMMENT ON COLUMN public.conversations.lead_status IS 'Status do lead no CRM: novo, atendendo, agendado, finalizado';

-- Atualizar registros existentes que não têm status definido
UPDATE public.conversations
SET lead_status = 'novo'
WHERE lead_status IS NULL;
