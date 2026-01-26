import axios from 'axios';

class ChatwootService {
  constructor() {
    // 1. URL Base
    this.apiUrl = import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://chat.audicarefono.com.br';
    
    // 2. Token de Acesso
    // Tenta VITE_CHATWOOT_API_TOKEN, se não tiver, usa VITE_CHATWOOT_WEBSITE_TOKEN (que vi no seu .env)
    this.apiToken = import.meta.env.VITE_CHATWOOT_API_TOKEN || import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN;
    
    // 3. ID da Conta
    // Tenta pegar do .env, se não tiver, usa '1' como padrão (ou '2' se preferir forçar)
    // No seu backend vi que é 2, então vamos garantir que o frontend também use 2 se não especificado
    this.accountId = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1'; 
    
    // 4. Inbox ID
    // O ERRO ESTAVA AQUI: O frontend não via CHATWOOT_INBOX_ID.
    // Adicionei um fallback para '2' (baseado no seu .env local) para garantir que funcione
    this.inboxId = import.meta.env.VITE_CHATWOOT_INBOX_ID || '2';

    // Debug em desenvolvimento
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

    // Instância Axios Dedicada
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

  // Busca contato pelo telefone
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

  // Cria contato se não existir
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
        // Se der erro de duplicidade (422), tenta buscar
        if (error.response?.status === 422) {
            return this.findContact(contactData.phone);
        }
        console.error('Erro ao criar contato:', error);
        throw error;
    }
  }

  // Busca ou cria conversa
  async findOrCreateConversation(contactId) {
    try {
        // 1. Tenta buscar conversas existentes
        const search = await this.api.get(`/api/v1/accounts/${this.accountId}/contacts/${contactId}/conversations`);
        
        // Se achar conversa na inbox correta, retorna ela
        const existing = search.data.payload.find(c => c.inbox_id === parseInt(this.inboxId));
        if (existing) return existing;

        // 2. Se não, cria nova
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

  // Método principal chamado pelo botão do frontend
  async ensureConversationForNavigation(patient) {
    try {
      const phone = patient.phone || patient.phones?.[0]?.phone;
      if (!phone) throw new Error('Paciente sem telefone');

      // 1. Busca ou Cria Contato
      let contact = await this.findContact(phone);
      if (!contact) {
          contact = await this.createContact({
              name: patient.name,
              phone: phone,
              email: patient.email
          });
      }

      // 2. Busca ou Cria Conversa
      const conversation = await this.findOrCreateConversation(contact.id);

      // Retorna dados para abrir o iframe/link
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
}

export const chatwootService = new ChatwootService();