import { useState, useEffect, useRef } from 'react';
import { useConversations } from './useConversations';
import { whatsappService } from '../services/whatsappService';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { formatPhoneE164, validatePhoneE164 } from '@/lib/phoneUtils';
import { messageNotificationService } from '../services/messageNotificationService';

export function useWhatsApp() {
  const { toast } = useToast();
  
  // Hook de conversas para manipular a lista global
  const { 
    conversations, 
    loading: loadingConversations, 
    refetch: refreshConversations 
  } = useConversations();

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const channelRef = useRef(null);

  // Normalizador Agressivo: Remove TODOS os espaços e quebras de linha para comparação
  const normalize = (str) => String(str || '').replace(/\s/g, '').toLowerCase();

  // Deduplicação ROBUSTA: por ID, wa_message_id, conteúdo normalizado e timestamp
  const deduplicateMessages = (msgs) => {
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
      
      // 2. Deduplicar por wa_message_id (ID do WhatsApp - mais confiável que ID do banco)
      if (waMessageId && !uniqueByWaId.has(waMessageId)) {
        // Se já existe por ID do banco, não adicionar novamente
        if (!dbId || !uniqueById.has(dbId)) {
          uniqueByWaId.set(waMessageId, m);
        }
      }

      // 3. Deduplicar por conteúdo + timestamp + conversation_id (para mensagens sem ID)
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
    
    // Adicionar por wa_message_id apenas se não existir por ID do banco
    uniqueByWaId.forEach((msg) => {
      const existsById = msg.id && uniqueById.has(msg.id);
      if (!existsById) {
        // Verificar se não é duplicata por conteúdo
        const contentHash = `${normalize(msg.content || '')}_${msg.created_at}_${msg.sender_type}_${msg.conversation_id || ''}`;
        if (!seenContentHashes.has(contentHash)) {
          result.push(msg);
          seenContentHashes.add(contentHash);
        }
      }
    });
    
    // Adicionar por conteúdo apenas se não existir por ID
    uniqueByContent.forEach((msg) => {
      const existsById = msg.id && uniqueById.has(msg.id);
      const waId = msg.wa_message_id || msg.wa_id;
      const existsByWaId = waId && uniqueByWaId.has(waId);
      
      if (!existsById && !existsByWaId) {
        result.push(msg);
      }
    });

    return result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  const markAsRead = async (conversationId) => {
    if (!conversationId) return;
    
    // Atualizar no banco
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
    
    if (error) {
      console.error('[useWhatsApp] Erro ao marcar como lida:', error);
      return;
    }
    
    // Refresh conversations list to update UI
    refreshConversations();
  };

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const initChat = async () => {
      setLoadingMessages(true);
      markAsRead(activeConversation.id);

      try {
        // Otimização: Limitar a 200 mensagens mais recentes e selecionar apenas campos necessários
        const { data, error } = await supabase
          .from('messages')
          .select('id, conversation_id, contact_id, clinic_id, sender_type, sender_id, content, status, media_url, message_type, wa_message_id, wa_id, created_at, updated_at')
          .eq('conversation_id', activeConversation.id)
          .order('created_at', { ascending: true })
          .limit(200); // Limitar para melhor performance

        if (error) throw error;
        
        // Deduplicar mensagens carregadas do banco
        const deduplicated = deduplicateMessages(data || []);
        
        // Marcar todas como processadas para evitar duplicação no Realtime
        deduplicated.forEach(msg => {
          const waId = msg.wa_message_id || msg.wa_id;
          if (waId) whatsappService.markMessageProcessed(waId);
          if (msg.id) whatsappService.markMessageProcessed(msg.id);
        });
        
        setMessages(deduplicated);
      } catch (error) {
        console.error('Erro chat:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    initChat();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`chat_room:${activeConversation.id}`, {
        config: {
          broadcast: { self: false }, // Não receber eventos próprios
          presence: { key: activeConversation.id }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${activeConversation.id}`
      }, (payload) => {
        // Extrair IDs da mensagem
        const waMessageId = payload.new.wa_message_id || payload.new.wa_id;
        const dbMessageId = payload.new.id;
        
        if (payload.eventType === 'INSERT') {
          // VERIFICAÇÃO PRÉVIA RÁPIDA: Verificar cache ANTES de qualquer processamento
          // Isso previne race conditions quando múltiplos eventos chegam ao mesmo tempo
          if (waMessageId && whatsappService.isMessageProcessed(waMessageId)) {
            console.log('[useWhatsApp] Mensagem já processada (wa_id), ignorando:', waMessageId);
            return;
          }
          if (dbMessageId && whatsappService.isMessageProcessed(dbMessageId)) {
            console.log('[useWhatsApp] Mensagem já processada (db_id), ignorando:', dbMessageId);
            return;
          }

          // Marcar como processada ANTES de processar (evita race condition)
          setMessages(prev => {
            // VERIFICAÇÃO 1: Verificar duplicação por wa_message_id (mais confiável - ID único do WhatsApp)
            if (waMessageId) {
              const existingByWaId = prev.find(m => {
                const mWaId = m.wa_message_id || m.wa_id;
                return mWaId === waMessageId;
              });
              if (existingByWaId) {
                console.log('[useWhatsApp] Mensagem já existe por wa_id, ignorando:', waMessageId);
                return prev; // Já existe, não adicionar
              }
            }

            // VERIFICAÇÃO 2: Verificar se já existe mensagem com mesmo ID do banco
            if (dbMessageId) {
              const existingById = prev.find(m => m.id === dbMessageId);
              if (existingById) {
                console.log('[useWhatsApp] Mensagem já existe por db_id, ignorando:', dbMessageId);
                return prev; // Já existe, não adicionar
              }
            }

            // 3. Anti-Eco para mensagens enviadas pelo usuário
            if (payload.new.sender_type === 'user') {
                const tempMatch = prev.find(m => 
                    m.id && m.id.toString().startsWith('temp-') && 
                    normalize(m.content || '') === normalize(payload.new.content || '') &&
                    m.conversation_id === payload.new.conversation_id &&
                    Math.abs(new Date(m.created_at) - new Date(payload.new.created_at)) < 5000 // 5 segundos
                );
                
                if (tempMatch) {
                    // Remove a temporária antiga e substitui pela real
                    const cleanPrev = prev.filter(m => m.id !== tempMatch.id);
                    return deduplicateMessages([...cleanPrev, payload.new]);
                }
            }

            // 4. Verificar duplicação por conteúdo + timestamp + conversation_id (mais preciso)
            const normalizedContent = normalize(payload.new.content || '');
            const duplicateByContent = prev.find(m => {
              if (m.conversation_id !== payload.new.conversation_id) return false;
              if (m.sender_type !== payload.new.sender_type) return false;
              
              const mContent = normalize(m.content || '');
              if (mContent !== normalizedContent) return false;
              
              // Verificar se o timestamp é muito próximo (dentro de 3 segundos)
              const timeDiff = Math.abs(new Date(m.created_at) - new Date(payload.new.created_at));
              return timeDiff < 3000; // 3 segundos
            });

            if (duplicateByContent) {
              // Mensagem duplicada por conteúdo+timestamp, ignorando
              return prev;
            }

            // 5. Adicionar e deduplicar
            const newMessages = deduplicateMessages([...prev, payload.new]);
            
            // MARCAR COMO PROCESSADA APÓS adicionar ao estado (evita race condition)
            // Fazemos DEPOIS porque só agora confirmamos que a mensagem foi realmente adicionada
            if (waMessageId) {
              whatsappService.markMessageProcessed(waMessageId);
            }
            if (dbMessageId) {
              whatsappService.markMessageProcessed(dbMessageId);
            }
            
            // Notificar sobre nova mensagem recebida
            if (payload.new.sender_type !== 'user' && payload.new.direction === 'inbound') {
              const contactName = activeConversation?.contact?.name || activeConversation?.contact?.phone || 'Desconhecido';
              messageNotificationService.notifyNewMessage(payload.new, contactName);
            }
            
            return newMessages;
          });
          markAsRead(activeConversation.id);
        } 
        else if (payload.eventType === 'UPDATE') {
          setMessages(prev => {
            const existing = prev.find(m => m.id === payload.new.id);
            if (!existing) {
              // Se não existe, pode ser uma atualização de status de mensagem otimista
              return prev;
            }
            return prev.map(m => m.id === payload.new.id ? payload.new : m);
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime conectado para conversa
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useWhatsApp] Erro no canal Realtime');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [activeConversation?.id]);

  const selectConversation = (conversation) => setActiveConversation(conversation);

  const updateActiveConversation = (updatedConversation) => {
    setActiveConversation(updatedConversation);
  };

  const sendMessage = async (payload) => {
    // Suporta texto, mídia e áudio
    const isMedia = payload?.media_url || payload?.file;
    const isAudio = payload?.message_type === 'audio' || payload?.type === 'audio';
    
    if (!activeConversation) return;
    
    // Validação: texto precisa ter conteúdo, mídia precisa ter URL ou arquivo
    if (!isMedia && !payload?.content?.trim() && typeof payload !== 'string') {
      return;
    }

    setIsSending(true);
    const tempId = 'temp-' + Date.now();
    
    // Mensagem otimista
    const optimisticMsg = {
      id: tempId, 
      conversation_id: activeConversation.id, 
      content: typeof payload === 'string' ? payload : (payload?.content || payload?.caption || ''),
      direction: 'outbound', 
      status: 'sending', 
      created_at: new Date().toISOString(),
      message_type: payload?.message_type || payload?.type || 'text',
      media_url: payload?.media_url,
      sender_type: 'user'
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Formata e valida o número antes de enviar
      const rawPhone = payload?.phone || activeConversation.contact?.phone || activeConversation.contact?.mobile_phone;
      const phoneE164 = formatPhoneE164(rawPhone);
      if (!validatePhoneE164(phoneE164)) {
        throw new Error('Telefone inválido para envio');
      }

      let result;
      if (isAudio && payload?.file) {
        // Enviar áudio
        result = await whatsappService.sendAudio(phoneE164, payload.file);
      } else if (isMedia && payload?.file) {
        // Enviar mídia (imagem, vídeo, documento)
        result = await whatsappService.sendMedia(
          phoneE164, 
          payload.file, 
          payload.message_type || payload.type || 'image',
          payload.content || payload.caption || ''
        );
      } else {
        // Enviar texto
        const text = typeof payload === 'string' ? payload : payload?.content;
        result = await whatsappService.sendMessage(phoneE164, text);
      }
      
      // Inserir no banco
      const messageData = {
        conversation_id: activeConversation.id,
        clinic_id: activeConversation.clinic_id,
        contact_id: activeConversation.contact_id,
        direction: 'outbound', 
        message_type: optimisticMsg.message_type,
        content: optimisticMsg.content,
        media_url: result?.media_url || optimisticMsg.media_url,
        status: 'sent', 
        sender_type: 'user'
      };

      const { data, error } = await supabase.from('messages').insert([messageData]).select().single();

      if (error) throw error;

      if (data) {
          setMessages(prev => {
             // Substitui o ID temporário pelo real imediatamente
             return prev.map(m => m.id === tempId ? data : m);
          });
          // Marcar como processada para evitar duplicação
          if (data.id) {
            whatsappService.markMessageProcessed(data.id);
          }
      }

    } catch (err) {
        console.error('Falha envio:', err);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        
        // Mensagem de erro mais clara
        let errorMessage = err.message || "Falha ao enviar mensagem.";
        
        // Se for erro de autenticação, sugerir login
        if (errorMessage.includes('autenticado') || errorMessage.includes('Sessão expirada')) {
          errorMessage += ' Por favor, recarregue a página e faça login novamente.';
        }
        
        toast({ 
          title: "Erro ao enviar", 
          description: errorMessage, 
          variant: "destructive",
          duration: 6000
        });
    } finally {
        setIsSending(false);
    }
  };

  return {
    conversations,
    activeConversation,
    messages,
    loading: loadingConversations,
    loadingMessages,
    isSending,
    selectConversation,
    sendMessage,
    refresh: refreshConversations,
    updateActiveConversation
  };
}

export default useWhatsApp;
