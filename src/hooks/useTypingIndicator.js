import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Hook para gerenciar indicador de digitação em conversas
 * Envia e recebe eventos de digitação via Supabase Realtime
 */
export function useTypingIndicator(conversationId, contactId) {
  const { user } = useAuth();
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  // Limpar timeout de digitação
  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Parar de indicar digitação após 3 segundos sem digitar
  const stopTyping = () => {
    setIsUserTyping(false);
    if (channelRef.current && conversationId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing_stopped',
        payload: {
          conversation_id: conversationId,
          user_id: user?.id,
          contact_id: contactId
        }
      });
    }
  };

  // Indicar que está digitando
  const startTyping = () => {
    const now = Date.now();
    // Throttle: só envia evento a cada 2 segundos
    if (now - lastTypingTimeRef.current < 2000) {
      return;
    }
    lastTypingTimeRef.current = now;

    setIsUserTyping(true);
    clearTypingTimeout();

    // Enviar evento de digitação
    if (channelRef.current && conversationId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing_started',
        payload: {
          conversation_id: conversationId,
          user_id: user?.id,
          contact_id: contactId
        }
      });
    }

    // Parar após 3 segundos sem digitar
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);
  };

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    // Criar canal Realtime para eventos de digitação
    const channel = supabase
      .channel(`typing:${conversationId}`, {
        config: {
          broadcast: { self: false } // Não receber próprios eventos
        }
      })
      .on('broadcast', { event: 'typing_started' }, (payload) => {
        // Ignorar se for o próprio usuário
        if (payload.payload.user_id === user.id) return;
        
        setIsContactTyping(true);
        
        // Parar indicador após 3 segundos
        setTimeout(() => {
          setIsContactTyping(false);
        }, 3000);
      })
      .on('broadcast', { event: 'typing_stopped' }, (payload) => {
        if (payload.payload.user_id === user.id) return;
        setIsContactTyping(false);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useTypingIndicator] Canal de digitação conectado');
        }
      });

    channelRef.current = channel;

    return () => {
      clearTypingTimeout();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, user?.id, contactId]);

  return {
    isContactTyping,
    isUserTyping,
    startTyping,
    stopTyping
  };
}

