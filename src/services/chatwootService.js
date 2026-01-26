import axios from 'axios';

class ChatwootService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://chat.audicarefono.com.br';
    this.apiToken = import.meta.env.VITE_CHATWOOT_API_TOKEN || import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN;
    this.accountId = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1';
    this.inboxId = import.meta.env.VITE_CHATWOOT_INBOX_ID || '2';

    if (import.meta.env.DEV) {
        console.log('[Chatwoot Config]', {
            url: this.apiUrl,
            account: this.accountId,
            inbox: this.inboxId,
            hasToken: !!this.apiToken
        });
    }

    if (!this.apiToken || !this.inboxId) {
      console.warn('⚠️ ChatwootService: Configurações incompletas.', {
          missingToken: !this.apiToken,
          missingInbox: !this.inboxId
      });
    }

    this.api = axios.create({
        baseURL: this.apiUrl,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api_access_token': this.apiToken,
        }
    });
  }

  // --- MÉTODOS PÚBLICOS ---

  async findContact(phone) {
    try {
        const cleanPhone = phone.replace(/\D/g, '');
        const response = await this.api.get(`/api/v1/accounts/${this.accountId}/contacts/search`, {
            params: { q: cleanPhone }
        });
        return response.data.payload && response.data.payload.length > 0 ? response.data.payload[0] : null;
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
        const response = await this.api.post(`/api/v1/accounts/${this.accountId}/contacts`, payload);
        return response.data.payload.contact;
    } catch (error) {
        if (error.response?.status === 422) {
            return this.findContact(contactData.phone);
        }
        console.error('Erro ao criar contato:', error);
        throw error;
    }
  }

  async findOrCreateConversation(contactId) {
    try {
        const search = await this.api.get(`/api/v1/accounts/${this.accountId}/contacts/${contactId}/conversations`);
        
        const existing = search.data.payload.find(c => c.inbox_id === parseInt(this.inboxId));
        if (existing) return existing;

        const response = await this.api.post(`/api/v1/accounts/${this.accountId}/conversations`, {
            source_id: contactId,
            inbox_id: this.inboxId,
            contact_id: contactId,
            status: 'open'
        });
        return response.data;
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

          // 3. Envia a mensagem
          await this.api.post(`/api/v1/accounts/${this.accountId}/conversations/${conversationId}/messages`, {
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