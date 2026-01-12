-- Migration: Prevenir mensagens duplicadas
-- Adiciona coluna wa_message_id se não existir e cria constraint única

-- 1. Adicionar coluna wa_message_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'wa_message_id'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN wa_message_id TEXT;
        
        COMMENT ON COLUMN public.messages.wa_message_id IS 'ID único da mensagem do WhatsApp (Uazapi) para prevenir duplicatas';
    END IF;
END $$;

-- 2. Criar índice único parcial (permite NULL, mas garante unicidade quando presente)
-- Isso previne duplicatas quando wa_message_id está presente
CREATE UNIQUE INDEX IF NOT EXISTS messages_wa_message_id_unique 
ON public.messages(wa_message_id) 
WHERE wa_message_id IS NOT NULL;

-- 3. Criar índice composto para deduplicação por conteúdo + timestamp + conversation
-- Isso ajuda na deduplicação mesmo quando wa_message_id não está disponível
CREATE INDEX IF NOT EXISTS messages_dedup_content_idx 
ON public.messages(conversation_id, content, created_at, sender_type)
WHERE content IS NOT NULL;

-- 4. Comentário explicativo
COMMENT ON INDEX messages_wa_message_id_unique IS 'Garante que cada mensagem do WhatsApp seja única no banco de dados';
COMMENT ON INDEX messages_dedup_content_idx IS 'Ajuda na deduplicação de mensagens por conteúdo e timestamp';

