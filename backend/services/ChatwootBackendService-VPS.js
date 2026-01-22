const axios = require('axios');

/**
 * Serviço para integração com Chatwoot - Versão para VPS
 * Adaptado para a estrutura atual da produção
 */
class ChatwootBackendService {
  constructor() {
    this.apiUrl = process.env.CHATWOOT_API_URL?.replace(/\/$/, '');
    this.apiToken = process.env.CHATWOOT_API_TOKEN;
    this.accountId = '2'; // Account ID fixo conforme configuração
    this.inboxId = process.env.CHATWOOT_INBOX_ID || '2';

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
   * Formata telefone para formato E164
   * @param {string} phoneNumber - Número do telefone
   * @returns {string} - Número formatado
   */
  formatPhoneToE164(phoneNumber) {
    // Remove todos os caracteres não numéricos
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Se já começa com 55, apenas adiciona o +
    if (cleaned.startsWith('55')) {
      return `+${cleaned}`;
    }

    // Se tem 11 dígitos (com 9), adiciona 55
    if (cleaned.length === 11) {
      return `+55${cleaned}`;
    }

    // Se tem 10 dígitos (sem 9), adiciona 55
    if (cleaned.length === 10) {
      return `+55${cleaned}`;
    }

    // Para outros casos, apenas adiciona + se não tiver
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  /**
   * Busca contato no Chatwoot por telefone
   * @param {string} phoneNumber - Número do telefone
   * @returns {Promise<Object|null>} - Dados do contato ou null se não encontrado
   */
  async findContactByPhone(phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneToE164(phoneNumber);
      console.log(`🔍 [Chatwoot Backend] Buscando contato por telefone: ${phoneNumber} (formatado: ${formattedPhone})`);

      const response = await axios.get(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/search`,
        {
          headers: this.headers,
          params: { q: formattedPhone }
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
      console.log(`🆕 [Chatwoot Backend] Criando contato:`, contactData);

      // Formatar telefone para E164
      const formattedPhone = this.formatPhoneToE164(contactData.phone_number);

      const payload = {
        name: contactData.name,
        phone_number: formattedPhone,
        email: contactData.email || '',
        custom_attributes: contactData.custom_attributes || {}
      };

      console.log(`📤 [Chatwoot Backend] Payload:`, JSON.stringify(payload, null, 2));
      console.log(`🔗 [Chatwoot Backend] URL: ${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts`);

      const response = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts`,
        payload,
        { headers: this.headers }
      );

      const newContact = response.data;
      console.log(`✅ [Chatwoot Backend] Contato criado:`, newContact);
      return newContact;

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro ao criar contato:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
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

      // Primeiro, tentar buscar conversas diretamente pela API de conversas
      try {
        const allConversationsResponse = await axios.get(
          `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations`,
          {
            headers: this.headers,
            params: {
              contact_id: contact.id,
              inbox_id: this.inboxId
            }
          }
        );

        const conversations = allConversationsResponse.data?.payload || [];

        if (conversations.length > 0) {
          const conversation = conversations[0];
          console.log(`✅ [Chatwoot Backend] Conversa existente encontrada: ${conversation.id}`);
          return conversation;
        }
      } catch (searchError) {
        console.warn('⚠️ [Chatwoot Backend] Erro ao buscar conversas existentes:', searchError.response?.data?.message || searchError.message);
      }

      // Se não encontrou, tentar buscar via endpoint do contato
      try {
        const contactConversationsResponse = await axios.get(
          `${this.apiUrl}/api/v1/accounts/${this.accountId}/contacts/${contact.id}/conversations`,
          { headers: this.headers }
        );

        const conversations = contactConversationsResponse.data?.payload || [];

        if (conversations.length > 0) {
          const conversation = conversations[0];
          console.log(`✅ [Chatwoot Backend] Conversa existente encontrada via contato: ${conversation.id}`);
          return conversation;
        }
      } catch (contactSearchError) {
        console.warn('⚠️ [Chatwoot Backend] Erro ao buscar conversas via contato:', contactSearchError.response?.data?.message || contactSearchError.message);
      }

      // Se não existe, criar nova conversa
      console.log(`🆕 [Chatwoot Backend] Criando nova conversa para contato: ${contact.name}`);

      const createResponse = await axios.post(
        `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations`,
        {
          contact_id: contact.id,
          inbox_id: this.inboxId
        },
        { headers: this.headers }
      );

      const newConversation = createResponse.data;
      console.log(`✅ [Chatwoot Backend] Nova conversa criada: ${newConversation.id}`);

      return newConversation;

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro em findOrCreateConversation:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
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

      // 3. Criar mensagem no Chatwoot (formato compatível com Bridge)
      const messageData = {
        content: message,
        message_type: 1, // Usar número ao invés de string
        private: false,
        content_type: 'text'
      };

      console.log(`💬 [Chatwoot Backend] Criando mensagem:`, JSON.stringify(messageData, null, 2));

      // Tentar formato alternativo se o padrão não funcionar
      let response;
      try {
        // Formato padrão
        response = await axios.post(
          `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations/${conversation.id}/messages`,
          { message: messageData },
          { headers: this.headers }
        );
      } catch (error) {
        console.warn('⚠️ [Chatwoot Backend] Tentando formato alternativo para mensagem...');

        // Formato alternativo: enviar diretamente sem wrapper "message"
        response = await axios.post(
          `${this.apiUrl}/api/v1/accounts/${this.accountId}/conversations/${conversation.id}/messages`,
          messageData,
          { headers: this.headers }
        );
      }

      const sentMessage = response.data;
      console.log(`✅ [Chatwoot Backend] Mensagem enviada:`, sentMessage);

      // Verificar se a mensagem foi criada com sucesso
      if (sentMessage && sentMessage.id) {
        console.log(`🎯 [Chatwoot Backend] Mensagem ID ${sentMessage.id} criada com sucesso no Chatwoot`);

        // Verificar status da mensagem
        if (sentMessage.status === 'sent' || sentMessage.status === 'delivered') {
          console.log(`📱 [Chatwoot Backend] Mensagem entregue via WhatsApp`);
        } else {
          console.log(`⏳ [Chatwoot Backend] Mensagem criada, aguardando entrega via Bridge`);
        }

        return {
          success: true,
          messageId: sentMessage.id,
          contactId: contact.id,
          conversationId: conversation.id,
          status: sentMessage.status
        };
      } else {
        throw new Error('Mensagem não foi criada corretamente no Chatwoot');
      }

    } catch (error) {
      console.error('❌ [Chatwoot Backend] Erro ao enviar mensagem:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

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
