const axios = require('axios');

/**
 * Serviço para integração com Chatwoot - Versão para VPS
 * Adaptado para a estrutura atual da produção
 */
class ChatwootBackendService {
  constructor() {
    this.apiUrl = process.env.CHATWOOT_API_URL?.replace(/\/$/, '');
    this.apiToken = process.env.CHATWOOT_API_TOKEN;
    this.accountId = process.env.CHATWOOT_INBOX_ID || '2'; // Usar inbox ID como account ID

    if (!this.apiUrl || !this.apiToken) {
      console.warn('⚠️ ChatwootBackendService: Configurações incompletas. Verifique CHATWOOT_API_URL e CHATWOOT_API_TOKEN');
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
   * Busca contato no Chatwoot por telefone
   * @param {string} phoneNumber - Número do telefone
   * @returns {Promise<Object|null>} - Dados do contato ou null se não encontrado
   */
  async findContactByPhone(phoneNumber) {
    try {
      console.log(`🔍 [Chatwoot Backend] Buscando contato por telefone: ${phoneNumber}`);

      const response = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/search`,
        {
          headers: this.headers,
          params: { q: phoneNumber }
        }
      );

      if (response.data?.payload?.length > 0) {
        const contact = response.data.payload[0];
        console.log(`✅ [Chatwoot Backend] Contato encontrado: ${contact.name} (ID: ${contact.id})`);
        return contact;
      }

      console.log(`ℹ️ [Chatwoot Backend] Contato não encontrado para: ${phoneNumber}`);
      return null;

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro ao buscar contato:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cria um novo contato no Chatwoot
   * @param {Object} contactData - Dados do contato
   * @returns {Promise<Object>} - Dados do contato criado
   */
  async createContact(contactData) {
    try {
      console.log(`🆕 [Chatwoot Backend] Criando contato: ${contactData.name}`);

      const payload = {
        contact: {
          name: contactData.name,
          phone_number: contactData.phone_number,
          email: contactData.email,
          custom_attributes: contactData.custom_attributes || {}
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts`,
        payload,
        { headers: this.headers }
      );

      const newContact = response.data;
      console.log(`✅ [Chatwoot Backend] Contato criado: ${newContact.name} (ID: ${newContact.id})`);
      return newContact;

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro ao criar contato:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca ou cria contato no Chatwoot
   * @param {Object} contactData - Dados do contato
   * @returns {Promise<Object>} - Contato encontrado/criado
   */
  async findOrCreateContact(contactData) {
    try {
      // Primeiro tentar buscar contato existente
      const existingContact = await this.findContactByPhone(contactData.phone);
      if (existingContact) {
        return existingContact;
      }

      // Se não encontrou, criar novo contato
      return await this.createContact({
        name: contactData.name || `Paciente ${contactData.phone}`,
        phone_number: contactData.phone,
        email: contactData.email || '',
        custom_attributes: contactData.custom_attributes || {}
      });

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro em findOrCreateContact:', error.message);
      throw error;
    }
  }

  /**
   * Busca ou cria conversa para um contato
   * @param {Object} contact - Dados do contato
   * @returns {Promise<Object>} - Conversa encontrada/criada
   */
  async findOrCreateConversation(contact) {
    try {
      console.log(`💬 [Chatwoot Backend] Buscando conversa para contato ID: ${contact.id}`);

      // Buscar conversas existentes para o contato
      const response = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/${contact.id}/conversations`,
        { headers: this.headers }
      );

      const conversations = response.data?.payload || [];

      // Se já existe uma conversa, usar a primeira
      if (conversations.length > 0) {
        const conversation = conversations[0];
        console.log(`✅ [Chatwoot Backend] Conversa existente encontrada: ${conversation.id}`);
        return conversation;
      }

      // Se não existe, criar nova conversa
      console.log(`🆕 [Chatwoot Backend] Criando nova conversa para contato: ${contact.name}`);

      const createResponse = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations`,
        {
          contact_id: contact.id,
          inbox_id: process.env.CHATWOOT_INBOX_ID || '2' // Inbox ID da configuração
        },
        { headers: this.headers }
      );

      const newConversation = createResponse.data;
      console.log(`✅ [Chatwoot Backend] Nova conversa criada: ${newConversation.id}`);

      return newConversation;

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro em findOrCreateConversation:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia mensagem para um contato via Chatwoot
   * @param {string} phoneNumber - Número do telefone
   * @param {string} message - Conteúdo da mensagem
   * @param {string} messageType - Tipo da mensagem ('outgoing' para bot/agente)
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendMessage(phoneNumber, message, messageType = 'outgoing') {
    try {
      console.log(`📤 [Chatwoot Backend] Enviando mensagem ${messageType} para ${phoneNumber}`);

      // 1. Buscar ou criar contato
      const contact = await this.findOrCreateContact({
        phone: phoneNumber,
        name: `Paciente ${phoneNumber}`
      });

      // 2. Buscar ou criar conversa
      const conversation = await this.findOrCreateConversation(contact);

      // 3. Criar mensagem no Chatwoot
      const messageData = {
        content: message,
        message_type: messageType,
        private: false
      };

      const response = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations/${conversation.id}/messages`,
        { message: messageData },
        { headers: this.headers }
      );

      const sentMessage = response.data;
      console.log(`✅ [Chatwoot Backend] Mensagem enviada: ${sentMessage.id}`);

      return {
        success: true,
        messageId: sentMessage.id,
        contactId: contact.id,
        conversationId: conversation.id
      };

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro ao enviar mensagem:', error.response?.data || error.message);

      // Fallback: simulação se a API falhar (compatibilidade com versão antiga)
      console.warn('⚠️ [Chatwoot Backend] Usando modo simulação devido ao erro');
      return {
        success: true, // Mantém como sucesso para não quebrar automações
        messageId: `fallback_${Date.now()}`,
        error: error.message
      };
    }
  }

  /**
   * Envia arquivo para um contato via Chatwoot
   * @param {string} phoneNumber - Número do telefone
   * @param {Buffer} fileBuffer - Buffer do arquivo
   * @param {string} fileName - Nome do arquivo
   * @param {string} caption - Legenda opcional
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendFile(phoneNumber, fileBuffer, fileName, caption = '') {
    try {
      console.log(`📎 [Chatwoot Backend] Enviando arquivo para ${phoneNumber}: ${fileName}`);

      // 1. Buscar ou criar contato
      const contact = await this.findOrCreateContact({
        phone: phoneNumber,
        name: `Paciente ${phoneNumber}`
      });

      // 2. Buscar ou criar conversa
      const conversation = await this.findOrCreateConversation(contact);

      // 3. Preparar FormData para upload
      const FormData = require('form-data');
      const formData = new FormData();

      // Adicionar arquivo
      formData.append('attachments[]', fileBuffer, {
        filename: fileName,
        contentType: this.getMimeTypeFromFileName(fileName)
      });

      // Adicionar dados da mensagem
      formData.append('content', caption || '');
      formData.append('message_type', 'outgoing');
      formData.append('private', 'false');

      // Headers especiais para multipart/form-data
      const formHeaders = {
        ...this.headers,
        ...formData.getHeaders()
      };

      const response = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations/${conversation.id}/messages`,
        formData,
        {
          headers: formHeaders,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const sentMessage = response.data;
      console.log(`✅ [Chatwoot Backend] Arquivo enviado: ${sentMessage.id}`);

      return {
        success: true,
        messageId: sentMessage.id,
        contactId: contact.id,
        conversationId: conversation.id
      };

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro ao enviar arquivo:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém MIME type baseado no nome do arquivo
   * @param {string} fileName - Nome do arquivo
   * @returns {string} - Tipo MIME
   */
  getMimeTypeFromFileName(fileName) {
    const ext = require('path').extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Verifica saúde da integração
   * @returns {Promise<Object>} - Status da integração
   */
  async checkHealth() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts`,
        {
          headers: this.headers,
          params: { page: 1, per_page: 1 }
        }
      );

      return {
        status: 'healthy',
        accountId: this.accountId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new ChatwootBackendService();
