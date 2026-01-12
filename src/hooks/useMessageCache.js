import { useState, useEffect, useCallback } from 'react';
import { cacheManager } from '@/utils/cacheManager';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook to interact with the message cache.
 * Provides cache-first loading and offline sync capabilities.
 */
export const useMessageCache = (conversationId) => {
  const [cachedMessages, setCachedMessages] = useState([]);
  const [isCacheLoading, setIsCacheLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState(null);
  const { toast } = useToast();

  // Load from cache immediately
  useEffect(() => {
    if (!conversationId) {
      setCachedMessages([]);
      setIsCacheLoading(false);
      return;
    }

    const loadCache = async () => {
      setIsCacheLoading(true);
      try {
        const msgs = await cacheManager.getMessages(conversationId);
        if (msgs && msgs.length > 0) {
          setCachedMessages(msgs);
        }
        
        // Load stats purely for debugging/monitoring
        const stats = await cacheManager.getStats();
        setCacheStats(stats);
      } catch (err) {
        console.warn("Cache load failed:", err);
      } finally {
        setIsCacheLoading(false);
      }
    };

    loadCache();
  }, [conversationId]);

  const updateCache = useCallback(async (messages) => {
    if (!conversationId) return;
    await cacheManager.saveMessages(conversationId, messages);
    setCachedMessages(messages);
  }, [conversationId]);

  const appendToCache = useCallback(async (message) => {
    await cacheManager.addMessage(message);
    setCachedMessages(prev => {
      // Avoid dupes in state
      if (prev.find(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const queueForSync = useCallback(async (message) => {
    await cacheManager.queueOfflineMessage(message, conversationId);
    toast({
      title: "Modo Offline",
      description: "Mensagem salva na fila e será enviada quando a conexão retornar.",
      variant: "warning"
    });
  }, [conversationId, toast]);

  const processOfflineQueue = useCallback(async (sendFunction) => {
    if (!navigator.onLine) return;
    
    const queue = await cacheManager.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`[Sync] Processing ${queue.length} offline messages...`);
    let processedCount = 0;

    for (const item of queue) {
      try {
        // Try to send
        await sendFunction(item);
        // Remove from queue if successful
        await cacheManager.removeFromQueue(item.temp_id);
        processedCount++;
      } catch (err) {
        console.error("[Sync] Failed to sync message:", item, err);
        // Keep in queue or move to "failed" store? For now keep in queue to retry later.
      }
    }

    if (processedCount > 0) {
      toast({
        title: "Sincronização Concluída",
        description: `${processedCount} mensagens enviadas.`,
      });
    }
  }, [toast]);

  // Auto-sync on online event
  useEffect(() => {
    const handleOnline = () => {
        // We need the sendFunction passed from the parent usually, 
        // or we can emit an event. For this architecture, we'll expose processOfflineQueue
        // and let useMessages call it.
        console.log("[Cache] Online detected.");
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return {
    cachedMessages,
    isCacheLoading,
    updateCache,
    appendToCache,
    queueForSync,
    processOfflineQueue,
    cacheStats
  };
};