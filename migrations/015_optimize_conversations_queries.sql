-- Migration: Otimização de Performance para Queries de Conversas
-- Adiciona índices compostos para melhorar performance das queries mais comuns

-- 1. Índice composto para a query principal de conversas (ordenada por last_message_at)
-- Isso acelera significativamente a query: SELECT ... FROM conversations ORDER BY last_message_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at_clinic 
ON public.conversations(clinic_id, last_message_at DESC NULLS LAST)
WHERE last_message_at IS NOT NULL;

-- 2. Índice composto para busca por clinic_id + contact_id (já temos UNIQUE, mas este ajuda em JOINs)
-- O índice único já existe, mas este índice adicional pode ajudar em queries específicas
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_contact_lookup
ON public.conversations(clinic_id, contact_id);

-- 3. Índice para mensagens por conversation_id ordenadas por created_at (query mais comum)
-- Isso acelera: SELECT ... FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at ASC);

-- 4. Índice para filtro de mensagens recebidas (sender_type != 'user')
-- Isso acelera o filtro do Realtime: sender_type=neq.user
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_conversation
ON public.messages(sender_type, conversation_id)
WHERE sender_type != 'user';

-- 5. Comentários
COMMENT ON INDEX idx_conversations_last_message_at_clinic IS 
'Índice composto para otimizar a query principal de listagem de conversas ordenadas por última mensagem';

COMMENT ON INDEX idx_messages_conversation_created IS 
'Índice composto para otimizar carregamento de mensagens de uma conversa ordenadas por data';

