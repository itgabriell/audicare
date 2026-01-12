-- Migration: 010_add_conversation_filters.sql
-- Description: Adiciona campos para filtros e organização de conversas

-- Adicionar campo is_favorite se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'is_favorite'
    ) THEN
        ALTER TABLE public.conversations 
        ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;
        
        COMMENT ON COLUMN public.conversations.is_favorite IS 'Indica se a conversa está marcada como favorita';
    END IF;
END $$;

-- Criar índice para melhorar performance de busca por favoritas
CREATE INDEX IF NOT EXISTS idx_conversations_is_favorite 
ON public.conversations(is_favorite) 
WHERE is_favorite = true;

-- Criar índice para melhorar performance de busca por status
CREATE INDEX IF NOT EXISTS idx_conversations_status 
ON public.conversations(status);

-- Criar índice composto para busca otimizada
CREATE INDEX IF NOT EXISTS idx_conversations_status_unread 
ON public.conversations(status, unread_count) 
WHERE unread_count > 0;

-- Comentários
COMMENT ON TABLE public.conversations IS 'Tabela de conversas com suporte a filtros e organização';

