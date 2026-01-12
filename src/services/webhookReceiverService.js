import { supabase } from '@/lib/customSupabaseClient';
import { debugService } from '@/services/debugService';

/**
 * WebhookReceiverService
 * Handles Realtime subscriptions.
 * Dependencies: Supabase Client, DebugService.
 */
class WebhookReceiverService {
  constructor() {
    this.channel = null;
    this.subscribers = new Set();
    this.stats = {
      eventsReceived: 0,
      isConnected: false
    };
  }

  initialize(userId) {
    if (this.channel) return;
    debugService.logInfo('Initializing WebhookReceiverService', { userId });

    this.channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => this.handleNewMessage(payload)
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, 
        (payload) => this.handleMessageUpdate(payload)
      )
      .subscribe((status) => {
        this.stats.isConnected = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') debugService.logInfo('WebhookReceiver Connected');
      });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event) {
    this.subscribers.forEach(cb => cb(event));
  }

  handleNewMessage(payload) {
    this.stats.eventsReceived++;
    this.notify({ type: 'new_message', data: payload.new });
  }

  handleMessageUpdate(payload) {
    this.stats.eventsReceived++;
    this.notify({ type: 'message_update', data: payload.new });
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const webhookReceiverService = new WebhookReceiverService();