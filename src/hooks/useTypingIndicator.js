import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Hook para gerenciar indicadores de digitação avançados
export function useTypingIndicator(conversationId, contactId) {
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Iniciar digitação (enviar para outros participantes)
  const startTyping = useCallback(() => {
    if (!conversationId) return;

    // Enviar evento de digitação via Supabase realtime
    supabase.channel(`typing_${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          userId: 'current_user', // TODO: integrar com auth
          timestamp: Date.now()
        }
      });

    // Resetar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-parar digitação após 3 segundos de inatividade
    typingTimeoutRef.current = setTimeout(() => {
      supabase.channel(`typing_${conversationId}`)
        .send({
          type: 'broadcast',
          event: 'typing_stop',
          payload: {
            userId: 'current_user',
            timestamp: Date.now()
          }
        });
    }, 3000);
  }, [conversationId]);

  // Parar digitação manualmente
  const stopTyping = useCallback(() => {
    if (!conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    supabase.channel(`typing_${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: {
          userId: 'current_user',
          timestamp: Date.now()
        }
      });
  }, [conversationId]);

  // Setup do realtime channel para receber indicadores de digitação
  useEffect(() => {
    if (!conversationId) {
      setIsContactTyping(false);
      setTypingUsers(new Map());
      return;
    }

    // Limpar channel anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`typing_${conversationId}`)
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        const { userId, timestamp } = payload.payload;

        // Não mostrar indicador para o próprio usuário
        if (userId === 'current_user') return;

        setTypingUsers(prev => {
          const updated = new Map(prev);
          updated.set(userId, {
            timestamp,
            timeout: setTimeout(() => {
              // Auto-remover após 5 segundos se não houver atualização
              setTypingUsers(current => {
                const newMap = new Map(current);
                newMap.delete(userId);
                return newMap;
              });
            }, 5000)
          });
          return updated;
        });
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        const { userId } = payload.payload;

        setTypingUsers(prev => {
          const updated = new Map(prev);
          const userData = updated.get(userId);
          if (userData?.timeout) {
            clearTimeout(userData.timeout);
          }
          updated.delete(userId);
          return updated;
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  // Atualizar estado de digitação baseado no contact atual
  useEffect(() => {
    if (!contactId) {
      setIsContactTyping(false);
      return;
    }

    // Verificar se o contato atual está digitando
    const contactTyping = Array.from(typingUsers.keys()).some(userId =>
      userId === contactId || userId.includes(contactId)
    );

    setIsContactTyping(contactTyping);
  }, [contactId, typingUsers]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingUsers.forEach(userData => {
        if (userData.timeout) {
          clearTimeout(userData.timeout);
        }
      });
    };
  }, []);

  return {
    isContactTyping,
    typingUsers: Array.from(typingUsers.keys()),
    startTyping,
    stopTyping,
    typingCount: typingUsers.size
  };
}

// Hook para múltiplos indicadores de digitação (para listas de conversas)
export function useMultiTypingIndicator(conversations) {
  const [conversationsTyping, setConversationsTyping] = useState(new Map());

  useEffect(() => {
    if (!conversations || conversations.length === 0) return;

    const channels = new Map();

    // Setup de channels para cada conversa
    conversations.forEach(conversation => {
      if (!conversation?.id) return;

      const channel = supabase
        .channel(`typing_${conversation.id}`)
        .on('broadcast', { event: 'typing_start' }, (payload) => {
          const { userId } = payload.payload;
          if (userId === 'current_user') return;

          setConversationsTyping(prev => {
            const updated = new Map(prev);
            const typingUsers = updated.get(conversation.id) || new Set();
            typingUsers.add(userId);
            updated.set(conversation.id, typingUsers);
            return updated;
          });
        })
        .on('broadcast', { event: 'typing_stop' }, (payload) => {
          const { userId } = payload.payload;

          setConversationsTyping(prev => {
            const updated = new Map(prev);
            const typingUsers = updated.get(conversation.id) || new Set();
            typingUsers.delete(userId);

            if (typingUsers.size === 0) {
              updated.delete(conversation.id);
            } else {
              updated.set(conversation.id, typingUsers);
            }

            return updated;
          });
        })
        .subscribe();

      channels.set(conversation.id, channel);
    });

    return () => {
      // Cleanup de todos os channels
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [conversations]);

  // Verificar se uma conversa específica tem alguém digitando
  const isConversationTyping = useCallback((conversationId) => {
    const typingUsers = conversationsTyping.get(conversationId);
    return typingUsers && typingUsers.size > 0;
  }, [conversationsTyping]);

  // Obter lista de usuários digitando em uma conversa
  const getTypingUsers = useCallback((conversationId) => {
    return Array.from(conversationsTyping.get(conversationId) || []);
  }, [conversationsTyping]);

  return {
    conversationsTyping,
    isConversationTyping,
    getTypingUsers
  };
}

// Hook para gerenciar presença (online/offline)
export function usePresence(conversationId) {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [presenceChannel, setPresenceChannel] = useState(null);

  useEffect(() => {
    if (!conversationId) {
      setOnlineUsers(new Set());
      return;
    }

    const channel = supabase.channel(`presence_${conversationId}`, {
      config: {
        presence: {
          key: 'current_user' // TODO: usar ID real do usuário
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const online = new Set();

        Object.values(presenceState).forEach((presences) => {
          presences.forEach((presence) => {
            online.add(presence.user_id);
          });
        });

        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence) => {
          setOnlineUsers(prev => new Set(prev).add(presence.user_id));
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence) => {
          setOnlineUsers(prev => {
            const updated = new Set(prev);
            updated.delete(presence.user_id);
            return updated;
          });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: 'current_user', // TODO: usar ID real
            online_at: new Date().toISOString()
          });
        }
      });

    setPresenceChannel(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [conversationId]);

  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const getOnlineCount = useCallback(() => {
    return onlineUsers.size;
  }, [onlineUsers]);

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline,
    getOnlineCount,
    presenceChannel
  };
}
