import { supabase } from '@/lib/customSupabaseClient';

class ChatwootService {
    constructor() {
        // Inbox ID real confirmado: 1
        this.inboxId = import.meta.env.VITE_CHATWOOT_INBOX_ID || '1';
        this.accountId = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '2';
        // Removed exposed API tokens and URLs. They are now managed by the Edge Function.
    }

    async _invokeProxy(method, endpoint, body = null) {
        // Change to point to Local Backend (VPS) instead of Edge Function
        // Assuming the backend is running on the same host or configured API URL
        // In local dev this might be http://localhost:4000
        // In prod it might be https://api.audicarefono.com.br or /api via nginx

        // Try to detect environment or use a fixed var
        // PRIORIDADE: VITE_API_BASE_URL -> Hardcoded Prod -> Localhost
        // Isso garante que em produção, se a variável sumir, ele tenta o domínio certo.
        const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';

        try {
            const response = await fetch(`${BACKEND_URL}/api/chatwoot-proxy`, {
                method: 'POST', // Always POST to our proxy endpoint
                headers: {
                    'Content-Type': 'application/json'
                    // Add auth headers if your backend requires them (e.g. Bearer token)
                },
                body: JSON.stringify({
                    method,
                    endpoint,
                    body
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[ChatwootService] Backend Proxy Error:', response.status, errorData);
                throw new Error(errorData.error || 'Backend Proxy Failed');
            }

            return await response.json();

        } catch (error) {
            console.error('[ChatwootService] Network/Proxy Error:', error);
            throw error;
        }
    }

    // --- MÉTODOS PÚBLICOS ---

    async findContact(phone) {
        try {
            // E.164 Standard: +<country><number>
            // Ensure we search with the '+' if searching by phone_number specifically, 
            // BUT Chatwoot search endpoint 'q' allows partials usually. 
            // However, to be precise, we should strip everything and ensure country code.

            let cleanPhone = phone.replace(/\D/g, '');
            if (!cleanPhone.startsWith('55') && cleanPhone.length > 9) {
                // Assume Brazil if no country code and it looks like a full number (10 or 11 digits)
                // But be careful not to double add if user inputted 55...
                // Safe assumption for this specific app context:
                cleanPhone = `55${cleanPhone}`;
            }

            // Chatwoot often indexes by the full E.164 string like '+55...'
            // We search for the number included in the string
            const data = await this._invokeProxy('GET', `/contacts/search?q=${cleanPhone}`);
            return data.payload && data.payload.length > 0 ? data.payload[0] : null;
        } catch (error) {
            console.error('Erro ao buscar contato no Chatwoot:', error);
            return null;
        }
    }

    async createContact(contactData) {
        try {
            let cleanPhone = contactData.phone.replace(/\D/g, '');
            if (!cleanPhone.startsWith('55') && cleanPhone.length > 9) {
                cleanPhone = `55${cleanPhone}`;
            }

            const payload = {
                name: contactData.name,
                phone_number: `+${cleanPhone}` // Strict E.164 for creation
            };

            if (contactData.email) {
                payload.email = contactData.email;
            }

            // Proxy POST request
            const data = await this._invokeProxy('POST', `/contacts`, payload);
            return data.payload.contact;
        } catch (error) {
            console.warn('Erro ao criar contato (possível duplicidade):', error);
            // Fallback: try finding it again with the strict formatted phone
            let cleanPhone = contactData.phone.replace(/\D/g, '');
            if (!cleanPhone.startsWith('55') && cleanPhone.length > 9) cleanPhone = `55${cleanPhone}`;

            return this.findContact(cleanPhone);
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

            // Format phone for search (checking country code)
            let formattedPhone = cleanPhone;
            if (!cleanPhone.startsWith('55') && cleanPhone.length > 9) {
                formattedPhone = `55${cleanPhone}`;
            }

            let contact = await this.findContact(formattedPhone);

            if (!contact) {
                // If not found, create strictly
                contact = await this.createContact({
                    name: patient.name,
                    phone: formattedPhone, // Already has 55, createContact adds +
                    email: patient.email || undefined // Pass undefined if null/empty
                });
            }

            const conversation = await this.findOrCreateConversation(contact.id);

            return {
                contactId: contact.id,
                conversationId: conversation.id,
                // Account ID garantido via env ou default 2
                accountId: this.accountId
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