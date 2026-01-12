-- Migration: Prevenir conversas duplicadas
-- Adiciona constraint única para garantir que um contato tenha apenas uma conversa por clínica

-- 1. Primeiro, remover conversas duplicadas mantendo apenas a mais recente
-- Isso garante que não haverá violação de constraint ao adicionar a UNIQUE
DO $$
DECLARE
    duplicate_record RECORD;
    conversation_to_keep UUID;
    conversations_to_delete UUID[];
BEGIN
    -- Encontrar todas as duplicatas (mesmo clinic_id + contact_id)
    FOR duplicate_record IN
        SELECT clinic_id, contact_id, COUNT(*) as count
        FROM public.conversations
        GROUP BY clinic_id, contact_id
        HAVING COUNT(*) > 1
    LOOP
        -- Para cada grupo de duplicatas, manter apenas a conversa mais recente
        SELECT id INTO conversation_to_keep
        FROM public.conversations
        WHERE clinic_id = duplicate_record.clinic_id
          AND contact_id = duplicate_record.contact_id
        ORDER BY last_message_at DESC NULLS LAST, created_at DESC
        LIMIT 1;

        -- Mover todas as mensagens das conversas duplicadas para a conversa mantida
        UPDATE public.messages
        SET conversation_id = conversation_to_keep
        WHERE conversation_id IN (
            SELECT id
            FROM public.conversations
            WHERE clinic_id = duplicate_record.clinic_id
              AND contact_id = duplicate_record.contact_id
              AND id != conversation_to_keep
        );

        -- Deletar as conversas duplicadas
        DELETE FROM public.conversations
        WHERE clinic_id = duplicate_record.clinic_id
          AND contact_id = duplicate_record.contact_id
          AND id != conversation_to_keep;
    END LOOP;
END $$;

-- 2. Criar índice único para prevenir duplicatas futuras
-- Isso garante que um contato tenha apenas uma conversa por clínica
CREATE UNIQUE INDEX IF NOT EXISTS conversations_clinic_contact_unique_idx
ON public.conversations(clinic_id, contact_id);

-- 3. Comentário explicativo
COMMENT ON INDEX conversations_clinic_contact_unique_idx IS 
'Garante que cada contato tenha apenas uma conversa por clínica, prevenindo duplicatas';

