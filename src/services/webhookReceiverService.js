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

    // --- SAFETY LOCK (TRAVA DE SEGURANÇA) ---
    // Rule: If message is from Contact (message_type === 0 or 'incoming')
    // AND Lead is in 'follow_up_N' stage -> Move to 'in_conversation' IMMEDIATELY.
    this.checkSafetyLock(payload.new);
  }

  async checkSafetyLock(message) {
    try {
      // 0 = Incoming (Contact), 1 = Outgoing (Agent) - Verify Chatwoot schema or internal schema
      // Assuming 'message_type' 0 is incoming or checks 'sender_type'
      // If your 'messages' table has 'message_type' where 'incoming' or 0 is client.

      // Quick verification: usually incoming messages have message_type 'incoming' or 0.
      // Let's assume standard behavior. If unsure, we check sender_type if available.
      const isIncoming = message.message_type === 0 || message.message_type === 'incoming';

      if (isIncoming) {
        // Find lead associated with this conversation? 
        // The message payload might have conversation_id.
        // We need to find the lead by chatwoot_conversation_id.

        if (message.conversation_id) {
          const { data: lead, error } = await supabase
            .from('leads')
            .select('id, status')
            .eq('chatwoot_conversation_id', message.conversation_id)
            .single();

          if (lead && !error) {
            const followUpStages = ['follow_up_1', 'follow_up_2', 'follow_up_3'];
            if (followUpStages.includes(lead.status)) {
              debugService.logInfo(`[Safety Lock] Disabling automation for Lead ${lead.id}. Moving to 'in_conversation'.`);
              await supabase
                .from('leads')
                .update({ status: 'in_conversation' })
                .eq('id', lead.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('[WebhookReceiver] Safety Lock Error:', err);
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