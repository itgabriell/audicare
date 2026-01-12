import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/database';
import { useMessageCache } from '@/hooks/useMessageCache';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { UAZAPI_ENDPOINTS } from '@/config/apiConfig';

export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // Network loading
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Integrate Cache Hook
  const { 
    cachedMessages, 
    isCacheLoading, 
    updateCache, 
    appendToCache, 
    queueForSync, 
    processOfflineQueue 
  } = useMessageCache(conversationId);

  // 1. Initialize state with cached messages when they load
  useEffect(() => {
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }
  }, [cachedMessages]);

  // 2. Fetch from Network (Supabase) -> Network First Strategy for Updates
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    
    // If we have no cache, show loading. If we have cache, load in background (stale-while-revalidate)
    if (messages.length === 0 && !isCacheLoading) {
      setLoading(true);
    }
    
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('momment', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        // Update State
        setMessages(data);
        // Update Cache
        updateCache(data);
      }
    } catch (err) {
      console.error('[useMessages] Erro ao buscar mensagens:', err);
      setError(err);
      
      // If network fails and we have no cache, show error
      if (messages.length === 0) {
        toast({
            title: "Erro de Conexão",
            description: "Não foi possível carregar as mensagens. Verifique sua internet.",
            variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, messages.length, isCacheLoading, updateCache, toast]);

  // Trigger fetch on mount or id change
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // 3. Realtime Subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            setMessages((prev) => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            appendToCache(newMsg);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
            // We should ideally update cache here too, but for performance we might skip or do partial update
            // For consistency, let's just add it
            appendToCache(payload.new); 
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
            // Handling delete in cache is tricky without a delete method in hook
            // We usually rely on full re-fetch/sync for deletes or add a specific method
            fetchMessages(); 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, appendToCache, fetchMessages]);

  // 4. Send Message Logic (With Offline Support)
  const sendMessage = useCallback(
    async (payload, conversation) => {
      if (!conversation?.id) {
        throw new Error('Conversa inválida.');
      }

      setSending(true);
      setError(null);

      // Prepare optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        clinic_id: conversation.clinic_id,
        conversation_id: conversation.id,
        contact_id: conversation.contact_id,
        content: payload.content,
        message_type: payload.message_type || payload.type || 'text',
        media_url: payload.media_url || null,
        media_mime_type: payload.mediaMime || (payload.file ? payload.file.type : null),
        wa_media_id: payload.waMediaId || null,
        direction: 'outbound',
        sender_type: 'user',
        status: 'sending', // UI status
        momment: Date.now(),
        created_at: new Date().toISOString()
      };

      // Update UI immediately
      setMessages(prev => [...prev, optimisticMsg]);

      // Network Check
      if (!navigator.onLine) {
         setSending(false);
         // Queue it
         await queueForSync(optimisticMsg);
         // Update status to 'pending' or 'queued' in UI?
         setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'queued' } : m));
         return;
      }

      try {
        const { data: inserted, error: insertError } = await supabase
          .from('messages')
          .insert({
             ...optimisticMsg,
             id: undefined, // Let DB generate ID
             status: 'pending'
          })
          .select('*')
          .single();

        if (insertError) throw insertError;

        // Replace optimistic with real
        setMessages(prev => prev.map(m => m.id === tempId ? inserted : m));
        appendToCache(inserted);

        // Trigger External API (Backend VPS)
        try {
            // Check for phone in payload (passed by ChatWindow) or fallback to conversation contact
            const targetPhone = payload.phone || conversation?.contact_phone || conversation?.contact?.phone;
            
            if (targetPhone) {
                if (payload.media_url) {
                    // Send Media
                    await axios.post(UAZAPI_ENDPOINTS.WA_SEND_MEDIA, {
                        phone: targetPhone,
                        message: payload.content || '', // Caption/Description
                        mediaUrl: payload.media_url,
                        mediaType: payload.message_type // 'image', 'document', 'video'
                    });
                } else {
                    // Send Text
                    await axios.post(UAZAPI_ENDPOINTS.WA_SEND_TEXT, {
                        phone: targetPhone,
                        message: payload.content
                    });
                }
            } else {
                console.warn("[useMessages] Telefone não encontrado para envio via API.");
            }
        } catch(apiErr) {
            console.warn("[Backend VPS] Send Warning:", apiErr);
            // Message is saved in DB, so it's not "lost", but failed to send to WA.
        }

      } catch (err) {
        console.error('[useMessages] Erro ao enviar:', err);
        // Revert or mark error
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        toast({
             title: "Erro no Envio",
             description: "Não foi possível salvar a mensagem.",
             variant: "destructive"
        });
      } finally {
        setSending(false);
      }
    },
    [appendToCache, queueForSync, toast]
  );

  // Sync offline queue on mount/online
  useEffect(() => {
    const sync = () => processOfflineQueue(async (msg) => {
        // Define how to send a queued message
        // This mimics the sendMessage logic but for a specific item
        const { error } = await supabase.from('messages').insert({
            ...msg,
            id: undefined, // Generate new ID
            temp_id: undefined, // Remove internal queue props
            _conversationId: undefined,
            _queuedAt: undefined,
            status: 'pending'
        });
        if (error) throw error;
    });

    if (navigator.onLine) sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [processOfflineQueue]);

  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    const term = searchTerm.toLowerCase();
    return messages.filter((m) =>
      (m.content || '').toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  return {
    messages: filteredMessages,
    rawMessages: messages,
    loading: loading && messages.length === 0, // Only show loading if no cached data
    isSending: sending,
    error,
    sendMessage,
    refetch: fetchMessages,
    searchTerm,
    setSearchTerm,
  };
};
