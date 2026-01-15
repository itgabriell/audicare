import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

// Hook especializado para gerenciar mensagens de chat
export function useChatMessages(conversationId, activeConversation) {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const channelRef = useRef(null);
  const queryClient = useQueryClient();

  // Query para buscar mensagens com cache
  const {
    data: cachedMessages = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: queryKeys.conversationMessages(conversationId),
    queryFn: () => fetchMessagesFromDB(conversationId),
    enabled: !!conversationId,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // Função para buscar mensagens do banco
  const fetchMessagesFromDB = async (convId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, contact_id, clinic_id, sender_type, sender_id, content, status, media_url, message_type, wa_message_id, wa_id, created_at, updated_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) throw error;
    return deduplicateMessages(data || []);
  };

  // Deduplicação robusta de mensagens
  const deduplicateMessages = useCallback((msgs) => {
    const uniqueById = new Map();
    const uniqueByWaId = new Map();
    const uniqueByContent = new Map();
    const seenContentHashes = new Set();

    msgs.forEach(m => {
      const waMessageId = m.wa_message_id || m.wa_id;
      const dbId = m.id;

      // 1. Deduplicar por ID do banco (mais confiável)
      if (dbId && !uniqueById.has(dbId)) {
        uniqueById.set(dbId, m);
      }

      // 2. Deduplicar por wa_message_id
      if (waMessageId && !uniqueByWaId.has(waMessageId)) {
        if (!dbId || !uniqueById.has(dbId)) {
          uniqueByWaId.set(waMessageId, m);
        }
      }

      // 3. Deduplicar por conteúdo + timestamp
      if (!dbId && !waMessageId) {
        const contentHash = `${normalize(m.content || '')}_${m.created_at}_${m.sender_type}_${m.conversation_id || ''}`;
        if (!seenContentHashes.has(contentHash)) {
          seenContentHashes.add(contentHash);
          const tempKey = `temp_${m.created_at}_${normalize(m.content || '')}_${m.conversation_id || ''}`;
          if (!uniqueByContent.has(tempKey)) {
            uniqueByContent.set(tempKey, m);
          }
        }
      }
    });

    // Combinar resultados: prioridade ID do banco > wa_message_id > conteúdo
    const result = Array.from(uniqueById.values());

    uniqueByWaId.forEach((msg) => {
      const existsById = msg.id && uniqueById.has(msg.id);
      if (!existsById) {
        const contentHash = `${normalize(msg.content || '')}_${msg.created_at}_${msg.sender_type}_${msg.conversation_id || ''}`;
        if (!seenContentHashes.has(contentHash)) {
          result.push(msg);
          seenContentHashes.add(contentHash);
        }
      }
    });

    uniqueByContent.forEach((msg) => {
      const existsById = msg.id && uniqueById.has(msg.id);
      const waId = msg.wa_message_id || msg.wa_id;
      const existsByWaId = waId && uniqueByWaId.has(waId);

      if (!existsById && !existsByWaId) {
        result.push(msg);
      }
    });

    return result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, []);

  const normalize = (str) => String(str || '').replace(/\s/g, '').toLowerCase();

  // Atualizar estado local quando cache é carregado
  useEffect(() => {
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }
  }, [cachedMessages]);

  // Setup do realtime quando conversation muda
  useEffect(() => {
    if (!conversationId || !activeConversation) {
      setMessages([]);
      return;
    }

    // Marcar conversa como lida
    markAsRead(conversationId);

    // Se já temos mensagens em cache, usar elas
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
    } else {
      // Buscar mensagens se não estiverem em cache
      setLoadingMessages(true);
      refetch().finally(() => setLoadingMessages(false));
    }

    // Setup realtime
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`chat_room:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        handleRealtimeMessage(payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [conversationId, activeConversation, cachedMessages, refetch]);

  // Marcar conversa como lida
  const markAsRead = async (convId) => {
    if (!convId) return;

    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', convId);

    if (error) {
      console.error('[useChatMessages] Erro ao marcar como lida:', error);
      return;
    }

    // Invalidate cache de conversas
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
  };

  // Handle realtime messages
  const handleRealtimeMessage = useCallback((payload) => {
    const waMessageId = payload.new.wa_message_id || payload.new.wa_id;
    const dbMessageId = payload.new.id;

    if (payload.eventType === 'INSERT') {
      // Verificações de deduplicação
      setMessages(prev => {
        // Verificar wa_message_id
        if (waMessageId) {
          const existingByWaId = prev.find(m => (m.wa_message_id || m.wa_id) === waMessageId);
          if (existingByWaId) return prev;
        }

        // Verificar db_id
        if (dbMessageId) {
          const existingById = prev.find(m => m.id === dbMessageId);
          if (existingById) return prev;
        }

        // Anti-duplicação por conteúdo
        const normalizedContent = normalize(payload.new.content || '');
        const duplicateByContent = prev.find(m => {
          if (m.conversation_id !== payload.new.conversation_id) return false;
          if (m.sender_type !== payload.new.sender_type) return false;

          const mContent = normalize(m.content || '');
          if (mContent !== normalizedContent) return false;

          const timeDiff = Math.abs(new Date(m.created_at) - new Date(payload.new.created_at));
          return timeDiff < 3000;
        });

        if (duplicateByContent) return prev;

        // Adicionar nova mensagem
        const newMessages = deduplicateMessages([...prev, payload.new]);

        // Atualizar cache
        queryClient.setQueryData(
          queryKeys.conversationMessages(conversationId),
          newMessages
        );

        return newMessages;
      });

      markAsRead(conversationId);

    } else if (payload.eventType === 'UPDATE') {
      setMessages(prev => {
        const existing = prev.find(m => m.id === payload.new.id);
        if (!existing) return prev;

        const updated = prev.map(m => m.id === payload.new.id ? payload.new : m);

        // Atualizar cache
        queryClient.setQueryData(
          queryKeys.conversationMessages(conversationId),
          updated
        );

        return updated;
      });
    }
  }, [conversationId, deduplicateMessages, normalize, queryClient]);

  return {
    messages,
    loadingMessages: loadingMessages || isLoading,
    refetch,
    markAsRead: (convId) => markAsRead(convId)
  };
}
