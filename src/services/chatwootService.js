import { supabase } from '@/lib/customSupabaseClient';

class ChatwootService {
    constructor() {
        this.inboxId = import.meta.env.VITE_CHATWOOT_INBOX_ID || '2';
        // Removed exposed API tokens and URLs. They are now managed by the Edge Function.
    }

    async _invokeProxy(method, endpoint, body = null) {
        const { data, error } = await supabase.functions.invoke('chatwoot-proxy', {
            body: {
                method,
                endpoint,
                body
            }
        });

        if (error) {
            console.error('[ChatwootService] Proxy Error:', error);
            throw error;
        }

        return data;
    }

    // --- MÉTODOS PÚBLICOS ---

    async findContact(phone) {
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            // Proxy GET request
            // Original: /api/v1/accounts/{id}/contacts/search?q={phone}
            const data = await this._invokeProxy('GET', `/contacts/search?q=${cleanPhone}`);
            return data.payload && data.payload.length > 0 ? data.payload[0] : null;
        } catch (error) {
            console.error('Erro ao buscar contato no Chatwoot:', error);
            return null;
        }
    }

    async createContact(contactData) {
        try {
            const payload = {
                name: contactData.name,
                email: contactData.email,
                phone_number: `+${contactData.phone.replace(/\D/g, '')}`
            };

            // Proxy POST request
            const data = await this._invokeProxy('POST', `/contacts`, payload);
            return data.payload.contact;
        } catch (error) {
            // Simple error handling for duplicate contacts, though the proxy might mask the 422 status structure.
            // Needs robust handling in real-world, but fallback to findContact is safe.
            console.warn('Erro ao criar contato (possível duplicidade):', error);
            return this.findContact(contactData.phone);
        }
    }

    async findOrCreateConversation(contactId) {
        try {
            const search = await this._invokeProxy('GET', `/contacts/${contactId}/conversations`);

            const existing = search.payload.find(c => c.inbox_id === parseInt(this.inboxId));
            if (existing) return existing;

            const data = await this._invokeProxy('POST', `/conversations`, {
                source_id: contactId,
                inbox_id: this.inboxId,
                contact_id: contactId,
                status: 'open'
            });
            return data;
        } catch (error) {
            console.error('Erro ao gerenciar conversa:', error);
            throw error;
        }
    }

    async ensureConversationForNavigation(patient) {
        try {
            const phone = patient.phone || patient.phones?.[0]?.phone;
            if (!phone) throw new Error('Paciente sem telefone');

            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

            let contact = await this.findContact(formattedPhone);
            if (!contact) {
                contact = await this.createContact({
                    name: patient.name,
                    phone: formattedPhone,
                    email: patient.email
                });
            }

            const conversation = await this.findOrCreateConversation(contact.id);

            return {
                contactId: contact.id,
                conversationId: conversation.id,
                // Account ID is hidden in backend now, but we return a placeholder or 
                // if the frontend relies on it for links, we might need to fetch it or keep it in env (non-sensitive).
                // For now, removing it from return unless strictly needed.
                accountId: 1 // Default/Fallback
            };

        } catch (error) {
            console.error('Erro ao preparar navegação Chatwoot:', error);
            throw error;
        }
    }

    // --- NOVO: FUNÇÃO PARA ENVIAR LEMBRETE ---
    async sendAppointmentReminder(appointment, patient, template = null) {
        try {
            // 1. Garante que a conversa existe
            const { conversationId } = await this.ensureConversationForNavigation(patient);

            // 2. Formata a mensagem
            const date = new Date(appointment.start_time).toLocaleDateString('pt-BR');
            const time = new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            let message = template || "Olá {patient_name}, lembramos do seu agendamento para {date} às {time}. Por favor, confirme sua presença.";

            message = message
                .replace('{patient_name}', patient.name)
                .replace('{date}', date)
                .replace('{time}', time);

            // 3. Envia a mensagem via Proxy
            await this._invokeProxy('POST', `/conversations/${conversationId}/messages`, {
                content: message,
                message_type: 'outgoing',
                private: false
            });

            return { success: true };
        } catch (error) {
            console.error('Erro ao enviar lembrete:', error);
            return { success: false, error: error.message };
        }
    }
}

export const chatwootService = new ChatwootService();