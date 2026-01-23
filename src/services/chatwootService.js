import axios from 'axios';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Serviço para integração com Chatwoot API
 */
class ChatwootService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_CHATWOOT_API_URL?.replace(/\/$/, '') || 'https://chat.audicarefono.com.br';
    this.apiToken = import.meta.env.VITE_CHATWOOT_API_TOKEN;
    this.accountId = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1'; // Verifique se é 1 ou 2 no seu Chatwoot
    this.inboxId = import.meta.env.VITE_CHATWOOT_INBOX_ID;

    if (!this.apiToken || !this.inboxId) {
      console.warn('⚠️ ChatwootService: Configurações incompletas.');
    }
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api_access_token': this.apiToken
    };
  }

  // --- MÉTODOS EXISTENTES (Mantidos para compatibilidade) ---
  
  async findOrCreateContact({ phone, name, email }) {
      try {
        console.log(`🔍 [Chatwoot] Buscando contato: ${phone}`);
        const searchResponse = await axios.get(
          `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/search`,
          { headers: this.headers, params: { q: phone } }
        );

        if (searchResponse.data?.payload?.length > 0) {
          return searchResponse.data.payload[0];
        }

        console.log(`🆕 [Chatwoot] Criando contato: ${name}`);
        const createResponse = await axios.post(
          `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts`,
          { contact: { name: name || phone, phone_number: `+${phone.replace(/\D/g, '')}`, email } },
          { headers: this.headers }
        );
        return createResponse.data.payload.contact;

      } catch (error) {
        console.error('❌ [Chatwoot] Erro findOrCreateContact:', error.message);
        throw error;
      }
  }

  async findOrCreateConversation(contactId) {
      try {
        // Busca conversas existentes
        const conversationsResponse = await axios.get(
            `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/${contactId}/conversations`,
            { headers: this.headers }
        );

        if (conversationsResponse.data?.payload?.length > 0) {
            return conversationsResponse.data.payload[0];
        }

        // Cria nova se não existir
        const createResponse = await axios.post(
            `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations`,
            { contact_id: contactId, inbox_id: this.inboxId },
            { headers: this.headers }
        );
        return createResponse.data;
      } catch (error) {
        console.error('❌ [Chatwoot] Erro findOrCreateConversation:', error.message);
        throw error;
      }
  }

  // --- NOVO MÉTODO PARA NAVEGAÇÃO ---

  /**
   * Garante que existe contato e conversa, e retorna os IDs para navegação
   */
  async ensureConversationForNavigation(patient) {
      try {
          // 1. Limpa o telefone
          const rawPhone = patient.phone || patient.phones?.[0]?.phone;
          if (!rawPhone) throw new Error("Paciente sem telefone");
          
          // Formata para +55...
          const phone = rawPhone.replace(/\D/g, '');
          const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;

          // 2. Busca/Cria Contato
          const contact = await this.findOrCreateContact({
              phone: formattedPhone,
              name: patient.name,
              email: patient.email
          });

          // 3. Busca/Cria Conversa
          const conversation = await this.findOrCreateConversation(contact.id);

          return {
              contactId: contact.id,
              conversationId: conversation.id,
              accountId: this.accountId
          };
      } catch (error) {
          console.error("Erro ao preparar navegação Chatwoot:", error);
          throw error;
      }
  }
}

export const chatwootService = new ChatwootService();
export default chatwootService;