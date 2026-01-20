import axios from 'axios';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Serviço para integração com Chatwoot API
 * Estratégia: Todas as mensagens passam pelo Chatwoot
 * A Bridge (backend) cuida da entrega no WhatsApp
 */
class ChatwootService {
  constructor() {
    this.apiUrl = process.env.CHATWOOT_API_URL?.replace(/\/$/, '');
    this.apiToken = process.env.CHATWOOT_API_TOKEN;
    this.accountId = process.env.CHATWOOT_ACCOUNT_ID || '2'; // Account ID padrão
    this.inboxId = process.env.CHATWOOT_INBOX_ID;

    if (!this.apiUrl || !this.apiToken || !this.inboxId) {
      console.warn('⚠️ ChatwootService: Configurações incompletas. Verifique CHATWOOT_API_URL, CHATWOOT_API_TOKEN e CHATWOOT_INBOX_ID');
    }
  }

  /**
   * Headers para requisições Chatwoot
   */
  get headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api_access_token': this.apiToken
    };
  }

  /**
   * Busca ou cria um contato no Chatwoot
   * @param {Object} contactData - Dados do contato {phone, name, avatar_url}
   * @returns {Promise<Object>} - Dados do contato criado/buscado
   */
  async findOrCreateContact(contactData) {
    try {
      const { phone, name, avatar_url } = contactData;

      console.log(`🔍 [Chatwoot] Buscando contato: ${phone}`);

      // Buscar contato existente por telefone
      const searchResponse = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/search`,
        {
          headers: this.headers,
          params: { q: phone }
        }
      );

      if (searchResponse.data?.payload?.length > 0) {
        const contact = searchResponse.data.payload[0];
        console.log(`✅ [Chatwoot] Contato encontrado: ${contact.name} (ID: ${contact.id})`);
        return contact;
      }

      // Criar novo contato
      console.log(`🆕 [Chatwoot] Criando contato: ${name} (${phone})`);

      const contactPayload = {
        name: name || `Contato ${phone}`,
        phone_number: phone,
        avatar_url: avatar_url
      };

      const createResponse = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts`,
        { contact: contactPayload },
        { headers: this.headers }
      );

      const newContact = createResponse.data;
      console.log(`✅ [Chatwoot] Contato criado: ${newContact.name} (ID: ${newContact.id})`);
      return newContact;

    } catch (error) {
      console.error('❌ [Chatwoot] Erro ao buscar/criar contato:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca ou cria uma conversa no Chatwoot
   * @param {Object} contact - Dados do contato
   * @returns {Promise<Object>} - Dados da conversa
   */
  async findOrCreateConversation(contact) {
    try {
      console.log(`🔍 [Chatwoot] Buscando conversa para contato ID: ${contact.id}`);

      // Buscar conversas existentes do contato
      const conversationsResponse = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/${contact.id}/conversations`,
        { headers: this.headers }
      );

      if (conversationsResponse.data?.payload?.length > 0) {
        const conversation = conversationsResponse.data.payload[0];
        console.log(`✅ [Chatwoot] Conversa encontrada: ${conversation.id}`);
        return conversation;
      }

      // Criar nova conversa
      console.log(`🆕 [Chatwoot] Criando conversa para contato: ${contact.name}`);

      const conversationData = {
        contact_id: contact.id,
        inbox_id: this.inboxId
      };

      const createResponse = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations`,
        conversationData,
        { headers: this.headers }
      );

      const newConversation = createResponse.data;
      console.log(`✅ [Chatwoot] Conversa criada: ${newConversation.id}`);
      return newConversation;

    } catch (error) {
      console.error('❌ [Chatwoot] Erro ao buscar/criar conversa:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia mensagem através do Chatwoot (será entregue pela Bridge)
   * @param {string} phone - Número do telefone
   * @param {string} message - Conteúdo da mensagem
   * @param {string} messageType - Tipo da mensagem ('outgoing' para bot/agente)
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMessage(phone, message, messageType = 'outgoing') {
    try {
      console.log(`📤 [Chatwoot] Enviando mensagem ${messageType} para ${phone}`);

      // 1. Buscar ou criar contato
      const contact = await this.findOrCreateContact({
        phone: phone,
        name: `Paciente ${phone}` // Nome genérico, será atualizado depois
      });

      // 2. Buscar ou criar conversa
      const conversation = await this.findOrCreateConversation(contact);

      // 3. Criar mensagem no Chatwoot
      const messageData = {
        content: message,
        message_type: messageType,
        private: false // Mensagens públicas são entregues pela Bridge
      };

      const response = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations/${conversation.id}/messages`,
        { message: messageData },
        { headers: this.headers }
      );

      const sentMessage = response.data;
      console.log(`✅ [Chatwoot] Mensagem enviada via Chatwoot: ${sentMessage.id}`);

      return {
        success: true,
        messageId: sentMessage.id,
        contactId: contact.id,
        conversationId: conversation.id
      };

    } catch (error) {
      console.error('❌ [Chatwoot] Erro ao enviar mensagem:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia lembrete de consulta via Chatwoot
   * @param {Object} appointment - Dados do agendamento
   * @param {Object} patient - Dados do paciente
   * @param {string} template - Template da mensagem
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendAppointmentReminder(appointment, patient, template = null) {
    try {
      const defaultTemplate = `Olá {{nome}}! 👋

Lembrando da sua consulta:
📅 Data: {{data}}
⏰ Horário: {{hora}}
📝 Serviço: {{servico}}

Por favor, confirme sua presença respondendo esta mensagem.

Atenciosamente,
Clínica Audicare`;

      const messageTemplate = template || defaultTemplate;

      // Processar template
      const message = this.processAppointmentTemplate(messageTemplate, appointment, patient);

      // Buscar telefone do paciente/contato
      let phoneNumber = null;

      // Primeiro tentar do appointment.contact
      if (appointment.contact?.phone) {
        phoneNumber = appointment.contact.phone;
      }
      // Depois do patient
      else if (patient?.phone) {
        phoneNumber = patient.phone;
      }

      if (!phoneNumber) {
        throw new Error('Número de telefone não encontrado para o paciente');
      }

      console.log(`📅 [Chatwoot] Enviando lembrete para ${patient?.name || 'Paciente'} (${phoneNumber})`);

      return await this.sendMessage(phoneNumber, message, 'outgoing');

    } catch (error) {
      console.error('❌ [Chatwoot] Erro ao enviar lembrete:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processa template de mensagem de consulta
   * @param {string} template - Template da mensagem
   * @param {Object} appointment - Dados do agendamento
   * @param {Object} patient - Dados do paciente
   * @returns {string} - Mensagem processada
   */
  processAppointmentTemplate(template, appointment, patient) {
    const appointmentDate = new Date(appointment.start_time);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
    const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return template
      .replace(/\{\{nome\}\}/g, patient?.name || 'Paciente')
      .replace(/\{\{data\}\}/g, formattedDate)
      .replace(/\{\{hora\}\}/g, formattedTime)
      .replace(/\{\{servico\}\}/g, appointment.title || 'Consulta')
      .replace(/\{\{obs\}\}/g, appointment.obs || '');
  }

  /**
   * Atualiza informações do contato no Chatwoot
   * @param {string} contactId - ID do contato no Chatwoot
   * @param {Object} updateData - Dados para atualizar
   * @returns {Promise<Object>} - Resultado da atualização
   */
  async updateContact(contactId, updateData) {
    try {
      console.log(`📝 [Chatwoot] Atualizando contato ${contactId}`);

      const response = await axios.patch(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/${contactId}`,
        { contact: updateData },
        { headers: this.headers }
      );

      console.log(`✅ [Chatwoot] Contato atualizado: ${contactId}`);
      return response.data;

    } catch (error) {
      console.error('❌ [Chatwoot] Erro ao atualizar contato:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verifica saúde da integração com Chatwoot
   * @returns {Promise<Object>} - Status da integração
   */
  async checkHealth() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/inboxes`,
        { headers: this.headers }
      );

      return {
        status: 'healthy',
        accountId: this.accountId,
        inboxId: this.inboxId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [Chatwoot] Health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Sincroniza paciente/contato com Chatwoot
   * Chamado quando um paciente é criado/atualizado
   * @param {Object} patient - Dados do paciente
   * @param {string} phoneNumber - Número de telefone específico
   * @returns {Promise<Object>} - Resultado da sincronização
   */
  async syncPatientToChatwoot(patient, phoneNumber = null) {
    try {
      const phone = phoneNumber || patient.phone;

      if (!phone) {
        console.warn('⚠️ [Chatwoot] Paciente sem telefone, pulando sincronização');
        return { success: false, reason: 'no_phone' };
      }

      console.log(`🔄 [Chatwoot] Sincronizando paciente ${patient.name} (${phone})`);

      // Buscar ou criar contato
      const contact = await this.findOrCreateContact({
        phone: phone,
        name: patient.name,
        avatar_url: patient.avatar_url
      });

      // Atualizar informações adicionais se necessário
      const updateData = {};
      if (patient.email && !contact.email) {
        updateData.email = patient.email;
      }

      if (Object.keys(updateData).length > 0) {
        await this.updateContact(contact.id, updateData);
      }

      console.log(`✅ [Chatwoot] Paciente sincronizado: ${patient.name}`);
      return {
        success: true,
        contactId: contact.id,
        chatwootContact: contact
      };

    } catch (error) {
      console.error('❌ [Chatwoot] Erro na sincronização:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const chatwootService = new ChatwootService();
export default chatwootService;
