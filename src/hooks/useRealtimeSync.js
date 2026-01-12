import { useState, useEffect, useCallback, useRef } from 'react';
import { webhookReceiverService } from '@/services/webhookReceiverService';
import { whatsappService } from '@/services/whatsappService';
import { debugService } from '@/services/debugService';

export const useRealtimeSync = (user) => {
  const [conversations, setConversations] = useState([]);
  const [syncStatus, setSyncStatus] = useState('disconnected'); // connecting, connected, disconnected
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ messages: 0, events: 0 });

  // Keep track of mounted state
  const isMounted = useRef(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.profile?.clinic_id) return;
    
    try {
      setSyncStatus(prev => prev === 'connected' ? 'connected' : 'syncing'); // Don't flash syncing if already connected
      const data = await whatsappService.getContacts();
      
      if (isMounted.current && data) {
        setConversations(data);
        setLastSync(new Date());
        setSyncStatus('connected');
        setError(null);
      }
    } catch (err) {
      console.warn("Sync failed:", err);
      if (isMounted.current) {
        setError(err);
        setSyncStatus('error');
      }
    }
  }, [user]);

  // Initial Load and Service Subscription
  useEffect(() => {
    isMounted.current = true;
    if (user) {
      // 1. Initial Fetch
      fetchConversations();

      // 2. Initialize Webhook Receiver
      webhookReceiverService.initialize(user.id);

      // 3. Subscribe to events
      const unsubscribe = webhookReceiverService.subscribe((event) => {
        if (!isMounted.current) return;

        // Update local stats for debug
        const currentStats = webhookReceiverService.getStats();
        setStats({ messages: currentStats.messagesReceived, events: currentStats.eventsReceived });

        switch (event.type) {
          case 'connection_status':
            setSyncStatus(event.status === 'connected' ? 'connected' : 'disconnected');
            break;
            
          case 'new_message':
            // Optimistic update or refetch
            // Ideally we update state directly, but for simplicity we refetch the list 
            // to get updated last_message snippets and ordering.
            fetchConversations();
            break;
            
          case 'message_update':
            // Message status changed (sent -> delivered -> read)
            // Trigger re-fetch to update UI indicators
            // Optimization: In a larger app, we would update the specific item in state array
            fetchConversations(); 
            break;
            
          case 'contact_update':
            fetchConversations();
            break;
            
          default:
            break;
        }
      });

      return () => {
        isMounted.current = false;
        unsubscribe();
        webhookReceiverService.disconnect();
      };
    }
  }, [user, fetchConversations]);

  // Polling fallback (safety net)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll if we haven't had an event in a while or just to be safe
      const diff = Date.now() - (lastSync ? lastSync.getTime() : 0);
      if (diff > 30000) { // 30s fallback
         fetchConversations();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [lastSync, fetchConversations]);

  return {
    conversations,
    syncStatus,
    isOnline: syncStatus === 'connected',
    lastSync,
    error,
    stats,
    forceSync: fetchConversations
  };
};