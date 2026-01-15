import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { queryKeys } from '@/lib/queryClient';
import { messageNotificationService } from '../services/messageNotificationService';

// Hook especializado para gerenciar conversas com cache inteligente
export function useChatConversations() {
  const queryClient = useQueryClient();
  const updateTimeoutRef = useRef(null);

  // Query principal para conversas
  const {
    data: conversations = [],
    isLoading,
    refetch,
    error
  } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: fetchConversations,
    staleTime: 30 * 1000, // 30 segundos - dados frescos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // Função para buscar conversas
  async function fetchConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select(`id, clinic_id, contact_id, status, lead_status, last_message_at, last_message_preview, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, profile_pic_url, channel_type)`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) throw error;

    // Remover duplicatas baseado em (clinic_id + contact_id)
    const uniqueConversations = [];
    const seenKeys = new Set();

    (data || []).forEach(conv => {
      const contactId = conv.contact_id || conv.contact?.id;
      const clinicId = conv.clinic_id;

      if (contactId && clinicId) {
        const key = `${clinicId}_${contactId}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueConversations.push(conv);
        }
      } else if (!contactId || !clinicId) {
        uniqueConversations.push(conv);
      }
    });

    return uniqueConversations;
  }

  // Setup dos canais realtime
  useEffect(() => {
    // Canal para atualizações de conversas
    const conversationsChannel = supabase
      .channel('conversations_list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, handleConversationUpdate)
      .subscribe();

    // Canal para novas mensagens
    const messagesChannel = supabase
      .channel('messages_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'sender_type=neq.user'
      }, handleNewMessage)
      .subscribe();

    // Canal para novos contatos
    const contactsChannel = supabase
      .channel('contacts_list')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'contacts'
      }, handleNewContact)
      .subscribe();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(contactsChannel);
    };
  }, []);

  // Handler para atualizações de conversas
  const handleConversationUpdate = async (payload) => {
    if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') {
      return;
    }

    // Debounce para evitar múltiplas queries simultâneas
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: updatedConv } = await supabase
          .from('conversations')
          .select(`id, clinic_id, contact_id, status, lead_status, last_message_at, last_message_preview, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, profile_pic_url, channel_type)`)
          .eq('id', payload.new.id)
          .single();

        if (updatedConv) {
          updateConversationInCache(updatedConv);
          notifyNewConversation(updatedConv);
        }
      } catch (error) {
        console.error('[useChatConversations] Erro ao atualizar conversa:', error);
      }
    }, 100);
  };

  // Handler para novas mensagens
  const handleNewMessage = async (payload) => {
    if (!payload.new.conversation_id) return;

    try {
      const { data: updatedConv } = await supabase
        .from('conversations')
        .select(`id, clinic_id, contact_id, status, lead_status, last_message_at, last_message_preview, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, profile_pic_url, channel_type)`)
        .eq('id', payload.new.conversation_id)
        .single();

      if (updatedConv) {
        updateConversationInCache(updatedConv);
        notifyNewConversation(updatedConv);
      }
    } catch (error) {
      console.error('[useChatConversations] Erro ao atualizar conversa por mensagem:', error);
    }
  };

  // Handler para novos contatos
  const handleNewContact = async (payload) => {
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`id, clinic_id, contact_id, status, lead_status, last_message_at, last_message_preview, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, profile_pic_url, channel_type)`)
        .eq('contact_id', payload.new.id)
        .maybeSingle();

      if (conversation) {
        updateConversationInCache(conversation);
      }
    } catch (error) {
      console.error('[useChatConversations] Erro ao buscar conversa para novo contato:', error);
    }
  };

  // Atualizar conversa no cache
  const updateConversationInCache = (updatedConv) => {
    queryClient.setQueryData(queryKeys.conversations, (oldConversations = []) => {
      // Remover duplicatas
      const contactId = updatedConv.contact_id || updatedConv.contact?.id;
      const clinicId = updatedConv.clinic_id;

      const others = oldConversations.filter(c => {
        const cContactId = c.contact_id || c.contact?.id;
        const cClinicId = c.clinic_id;
        return c.id !== updatedConv.id &&
               !(cClinicId === clinicId && cContactId === contactId);
      });

      // Inserir na posição correta (ordenado por last_message_at)
      const newDate = updatedConv.last_message_at ? new Date(updatedConv.last_message_at).getTime() : 0;

      if (newDate === 0 || others.length === 0) {
        return [updatedConv, ...others];
      }

      let insertIndex = 0;
      for (let i = 0; i < others.length; i++) {
        const cDate = others[i].last_message_at ? new Date(others[i].last_message_at).getTime() : 0;
        if (newDate >= cDate) {
          insertIndex = i;
          break;
        }
        insertIndex = i + 1;
      }

      const result = [...others];
      result.splice(insertIndex, 0, updatedConv);
      return result;
    });
  };

  // Notificar sobre nova conversa
  const notifyNewConversation = (conversation) => {
    const prevConversations = queryClient.getQueryData(queryKeys.conversations) || [];
    const prevConv = prevConversations.find(c => {
      const cContactId = c.contact_id || c.contact?.id;
      const contactId = conversation.contact_id || conversation.contact?.id;
      return c.id === conversation.id || (c.clinic_id === conversation.clinic_id && cContactId === contactId);
    });

    const wasNew = !prevConv;
    const unreadIncreased = prevConv && (prevConv.unread_count || 0) < (conversation.unread_count || 0);

    if ((wasNew || unreadIncreased) && conversation.unread_count > 0) {
      messageNotificationService.notifyNewConversation(conversation);
    }
  };

  return {
    conversations,
    loading: isLoading,
    error,
    refetch
  };
}
