import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { messageNotificationService } from '../services/messageNotificationService';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const updateTimeoutRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      // Otimização: Limitar a 100 conversas mais recentes e selecionar apenas campos necessários
      const { data, error } = await supabase
        .from('conversations')
        .select(`id, clinic_id, contact_id, status, last_message_at, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, channel_type)`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100); // Limitar para melhor performance

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
          } else {
            // Se já existe, manter a mais recente
            const existingIndex = uniqueConversations.findIndex(c => {
              const cContactId = c.contact_id || c.contact?.id;
              return c.clinic_id === clinicId && cContactId === contactId;
            });
            if (existingIndex >= 0) {
              const existing = uniqueConversations[existingIndex];
              const existingDate = new Date(existing.last_message_at || existing.created_at || 0);
              const newDate = new Date(conv.last_message_at || conv.created_at || 0);
              if (newDate > existingDate) {
                uniqueConversations[existingIndex] = conv;
              }
            }
          }
        } else if (!contactId || !clinicId) {
          uniqueConversations.push(conv);
        }
      });
      
      setConversations(uniqueConversations);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    // Canal para conversas
    const conversationsChannel = supabase
      .channel('public:conversations_list', {
        config: {
          broadcast: { self: false }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations' 
      }, async (payload) => {
        // Otimização: Só processar INSERT e UPDATE, ignorar DELETE
        if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') {
          return;
        }
        
        // Otimização: Debounce para evitar múltiplas queries simultâneas
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(async () => {
          try {
            const { data: updatedConv } = await supabase
              .from('conversations')
              .select(`id, clinic_id, contact_id, status, last_message_at, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, channel_type)`)
              .eq('id', payload.new.id)
              .single();

            if (updatedConv) {
              setConversations(prev => {
                // Remove duplicatas: remove por ID e também por contact_id (garantir apenas uma conversa por contato)
                const contactId = updatedConv.contact_id || updatedConv.contact?.id;
                const clinicId = updatedConv.clinic_id;
                
                // Remover todas as conversas com o mesmo contact_id (incluindo a atual se for diferente)
                const others = prev.filter(c => {
                  const cContactId = c.contact_id || c.contact?.id;
                  const cClinicId = c.clinic_id;
                  // Manter apenas se for diferente por ID E por (clinic_id + contact_id)
                  return c.id !== updatedConv.id && 
                         !(cClinicId === clinicId && cContactId === contactId);
                });
                
                // Verificar se é uma nova conversa ou mensagem não lida para notificar
                const prevConv = prev.find(c => {
                  const cContactId = c.contact_id || c.contact?.id;
                  return c.id === updatedConv.id || 
                         (c.clinic_id === clinicId && cContactId === contactId);
                });
                const wasNew = !prevConv;
                const unreadIncreased = prevConv && (prevConv.unread_count || 0) < (updatedConv.unread_count || 0);
                
                // Notificar se for nova conversa ou se aumentou não lidas
                if ((wasNew || unreadIncreased) && updatedConv.unread_count > 0) {
                  messageNotificationService.notifyNewConversation(updatedConv);
                }
                
                // Adiciona no topo se tiver last_message_at mais recente, senão mantém ordem
                // Otimização: evitar ordenação completa, apenas inserir na posição correta
                const newDate = updatedConv.last_message_at ? new Date(updatedConv.last_message_at).getTime() : 0;
                
                if (newDate === 0 || others.length === 0) {
                  return [updatedConv, ...others];
                }
                
                // Encontrar posição correta sem ordenar tudo
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
            }
          } catch (error) {
            console.error('[useConversations] Erro ao atualizar conversa:', error);
          }
        }, 100); // Debounce de 100ms
      })
      .subscribe();

    // Canal para mensagens - quando uma nova mensagem chega, atualizar a conversa correspondente
    const messagesChannel = supabase
      .channel('public:messages_updates', {
        config: {
          broadcast: { self: false }
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: 'sender_type=neq.user' // Apenas mensagens recebidas
      }, async (payload) => {
        // Buscar a conversa atualizada (otimizado: apenas campos necessários)
        // Removido console.log para melhorar performance
        if (payload.new.conversation_id) {
          const { data: updatedConv } = await supabase
            .from('conversations')
            .select(`id, clinic_id, contact_id, status, last_message_at, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, channel_type)`)
            .eq('id', payload.new.conversation_id)
            .single();

          if (updatedConv) {
            setConversations(prev => {
              // Remove duplicatas: remove por ID e também por (clinic_id + contact_id)
              const contactId = updatedConv.contact_id || updatedConv.contact?.id;
              const clinicId = updatedConv.clinic_id;
              
              // Remover todas as conversas com o mesmo (clinic_id + contact_id)
              const others = prev.filter(c => {
                const cContactId = c.contact_id || c.contact?.id;
                const cClinicId = c.clinic_id;
                return c.id !== updatedConv.id && 
                       !(cClinicId === clinicId && cContactId === contactId);
              });
              
              // Adiciona no topo se tiver last_message_at mais recente, senão mantém ordem
              // Otimização: evitar ordenação completa, apenas inserir na posição correta
              const newDate = updatedConv.last_message_at ? new Date(updatedConv.last_message_at).getTime() : 0;
              
              if (newDate === 0 || others.length === 0) {
                return [updatedConv, ...others];
              }
              
              // Encontrar posição correta sem ordenar tudo
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
          }
        }
      })
      .subscribe();

    // Canal para novos contatos (garantir que apareçam quando criados)
    const contactsChannel = supabase
      .channel('public:contacts_list', {
        config: {
          broadcast: { self: false }
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'contacts' 
      }, async (payload) => {
        // Novo contato criado - buscar conversa associada
        // Quando um novo contato é criado, buscar se há conversa associada (otimizado)
        const { data: conversation } = await supabase
          .from('conversations')
          .select(`id, clinic_id, contact_id, status, last_message_at, unread_count, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, channel_type)`)
          .eq('contact_id', payload.new.id)
          .maybeSingle();

        if (conversation) {
          setConversations(prev => {
            // Verificar se já existe por ID ou (clinic_id + contact_id)
            const contactId = conversation.contact_id || conversation.contact?.id;
            const clinicId = conversation.clinic_id;
            const exists = prev.find(c => {
              const cContactId = c.contact_id || c.contact?.id;
              return c.id === conversation.id || 
                     (c.clinic_id === clinicId && cContactId === contactId);
            });
            
            if (exists) {
              // Se existe, atualizar em vez de adicionar e remover duplicatas
              const others = prev.filter(c => {
                const cContactId = c.contact_id || c.contact?.id;
                return c.id !== conversation.id && 
                       !(c.clinic_id === clinicId && cContactId === contactId);
              });
              // Manter ordem (já ordenado pelo banco)
              return [conversation, ...others];
            }
            
            // Adicionar no topo, mas remover qualquer duplicata existente
            const others = prev.filter(c => {
              const cContactId = c.contact_id || c.contact?.id;
              return !(c.clinic_id === clinicId && cContactId === contactId);
            });
            // Manter ordem (já ordenado pelo banco)
            return [conversation, ...others];
          });
        } else {
          // Se não há conversa ainda, não recarregar imediatamente
          // A conversa será criada pelo backend quando a primeira mensagem chegar
          // Evitar recarregamento desnecessário que causa lentidão
        }
      })
      .subscribe();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}