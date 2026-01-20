const axios = require('axios');

/**
 * Serviço para integração com Chatwoot API
 */
class ChatwootService {
  constructor() {
    this.apiUrl = process.env.CHATWOOT_API_URL?.replace(/\/$/, '');
    this.apiToken = process.env.CHATWOOT_API_TOKEN;
    this.inboxId = process.env.CHATWOOT_INBOX_ID;
    this.uazapiUrl = process.env.UAZAPI_URL?.replace(/\/$/, '');
    this.uazapiKey = process.env.UAZAPI_API_KEY;

    if (!this.apiUrl || !this.apiToken || !this.inboxId) {
      console.warn('⚠️ ChatwootService: Configurações incompletas. Verifique CHATWOOT_API_URL, CHATWOOT_API_TOKEN e CHATWOOT_INBOX_ID');
    }

    if (!this.uazapiUrl || !this.uazapiKey) {
      console.warn('⚠️ ChatwootService: Configurações Uazapi incompletas. Verifique UAZAPI_URL e UAZAPI_API_KEY');
    }
  }

  /**
   * Headers para requisições Chatwoot
   */
  get chatwootHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api_access_token': this.apiToken
    };
  }

  /**
   * Headers para requisições Uazapi
   */
  get uazapiHeaders() {
    return {
      'Content-Type': 'application/json',
      'token': this.uazapiKey
    };
  }

  /**
   * Busca ou cria um contato no Chatwoot
   * @param {string} phone - Número do telefone
   * @param {string} name - Nome do contato
   * @param {string} avatarUrl - URL da foto de perfil (opcional)
   * @returns {Promise<Object>} - Dados do contato
   */
  async findOrCreateContact(phone, name, avatarUrl = null) {
    try {
      console.log(`🔍 [Chatwoot] Buscando contato: ${phone}`);

      // Buscar contato existente
      const searchResponse = await axios.get(
        `${this.apiUrl}/api/v1/contacts/search`,
        {
          headers: this.chatwootHeaders,
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

      const contactData = {
        name: name,
        phone_number: phone,
        avatar_url: avatarUrl
      };

      const createResponse = await axios.post(
        `${this.apiUrl}/api/v1/contacts`,
        { contact: contactData },
        { headers: this.chatwootHeaders }
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
        `${this.apiUrl}/api/v1/contacts/${contact.id}/conversations`,
        { headers: this.chatwootHeaders }
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
        `${this.apiUrl}/api/v1/conversations`,
        conversationData,
        { headers: this.chatwootHeaders }
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
   * Cria uma mensagem no Chatwoot
   * @param {Object} conversation - Dados da conversa
   * @param {string} content - Conteúdo da mensagem
   * @param {string} messageType - Tipo da mensagem ('incoming' ou 'outgoing')
   * @param {string} contentType - Tipo do conteúdo ('text', 'image', etc.)
   * @param {string} mediaUrl - URL da mídia (opcional)
   * @returns {Promise<Object>} - Dados da mensagem criada
   */
  async createMessage(conversation, content, messageType = 'incoming', contentType = 'text', mediaUrl = null) {
    try {
      console.log(`📝 [Chatwoot] Criando mensagem ${messageType} na conversa ${conversation.id}`);

      const messageData = {
        content: content,
        message_type: messageType,
        content_type: contentType,
        private: false
      };

      // Adicionar mídia se existir
      if (mediaUrl && contentType !== 'text') {
        messageData.attachments = [{
          file_type: contentType,
          external_url: mediaUrl
        }];
      }

      const response = await axios.post(
        `${this.apiUrl}/api/v1/conversations/${conversation.id}/messages`,
        { message: messageData },
        { headers: this.chatwootHeaders }
      );

      const message = response.data;
      console.log(`✅ [Chatwoot] Mensagem criada: ${message.id}`);
      return message;

    } catch (error) {
      console.error('❌ [Chatwoot] Erro ao criar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia mensagem via Uazapi (WhatsApp)
   * @param {string} phone - Número do telefone
   * @param {string} message - Conteúdo da mensagem
   * @returns {Promise<Object>} - Resposta da Uazapi
   */
  async sendWhatsAppMessage(phone, message) {
    try {
      console.log(`📤 [Uazapi] Enviando mensagem para ${phone}`);

      // Formatar número
      let targetPhone = String(phone).replace(/\D/g, '');
      if (targetPhone.length >= 10 && targetPhone.length <= 11) {
        targetPhone = '55' + targetPhone;
      }

      const response = await axios.post(
        `${this.uazapiUrl}/send/text`,
        {
          number: targetPhone,
          text: message
        },
        { headers: this.uazapiHeaders }
      );

      console.log(`✅ [Uazapi] Mensagem enviada para ${phone}`);
      return response.data;

    } catch (error) {
      console.error('❌ [Uazapi] Erro ao enviar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Processa webhook do Chatwoot
   * @param {Object} webhookData - Dados do webhook
   * @returns {Promise<boolean>} - Se processou com sucesso
   */
  async processChatwootWebhook(webhookData) {
    try {
      const { event, message_type, message, conversation, contact } = webhookData;

      // Verificar se é mensagem de saída (resposta do atendente)
      if (event !== 'message_created' || message_type !== 'outgoing') {
        console.log(`⏭️ [Chatwoot Webhook] Ignorado: evento=${event}, tipo=${message_type}`);
        return false;
      }

      // Verificar se é mensagem privada (não enviar para cliente)
      if (message.private) {
        console.log(`🔒 [Chatwoot Webhook] Mensagem privada ignorada`);
        return false;
      }

      // Extrair dados necessários
      const content = message.content;
      const phoneNumber = contact.phone_number;

      if (!content || !phoneNumber) {
        console.log(`⚠️ [Chatwoot Webhook] Dados insuficientes: content=${!!content}, phone=${!!phoneNumber}`);
        return false;
      }

      console.log(`🚀 [Chatwoot Webhook] Enviando resposta para ${phoneNumber}: "${content.substring(0, 50)}..."`);

      // Enviar via WhatsApp
      await this.sendWhatsAppMessage(phoneNumber, content);

      console.log(`✅ [Chatwoot Webhook] Resposta enviada com sucesso`);
      return true;

    } catch (error) {
      console.error('❌ [Chatwoot Webhook] Erro ao processar:', error.message);
      throw error;
    }
  }

  /**
   * Processa webhook do WhatsApp (Uazapi)
   * @param {Object} webhookData - Dados do webhook da Uazapi
   * @returns {Promise<boolean>} - Se processou com sucesso
   */
  async processWhatsAppWebhook(webhookData) {
    try {
      const { EventType, message } = webhookData;

      // Filtrar apenas mensagens recebidas
      if (EventType !== 'messages' || !message) {
        console.log(`⏭️ [WhatsApp Webhook] Ignorado: evento=${EventType}`);
        return false;
      }

      // Ignorar mensagens enviadas pelo bot
      if (message.fromMe || message.wasSentByApi) {
        console.log(`🤖 [WhatsApp Webhook] Mensagem do bot ignorada`);
        return false;
      }

      // Extrair dados da mensagem
      let senderPhone = this.extractPhoneNumber(message);
      const messageContent = message.text || message.content || message.body || '';
      const profileName = message.senderName || message.notifyName || message.name || `Contato ${senderPhone}`;

      if (!senderPhone) {
        console.log(`⚠️ [WhatsApp Webhook] Número do telefone não encontrado`);
        return false;
      }

      console.log(`📨 [WhatsApp Webhook] Mensagem recebida de ${senderPhone} (${profileName}): "${messageContent.substring(0, 50)}..."`);

      // Buscar ou criar contato no Chatwoot
      const contact = await this.findOrCreateContact(senderPhone, profileName);

      // Buscar ou criar conversa no Chatwoot
      const conversation = await this.findOrCreateConversation(contact);

      // Determinar tipo da mensagem e mídia
      const { contentType, mediaUrl } = this.extractMessageType(message);

      // Criar mensagem no Chatwoot
      await this.createMessage(conversation, messageContent, 'incoming', contentType, mediaUrl);

      console.log(`✅ [WhatsApp Webhook] Mensagem processada com sucesso`);
      return true;

    } catch (error) {
      console.error('❌ [WhatsApp Webhook] Erro ao processar:', error.message);
      throw error;
    }
  }

  /**
   * Extrai número de telefone do payload do WhatsApp
   * @param {Object} message - Dados da mensagem
   * @returns {string|null} - Número formatado ou null
   */
  extractPhoneNumber(message) {
    // Ordem de prioridade para extrair o número
    const phoneFields = ['phone', 'from', 'sender'];

    for (const field of phoneFields) {
      if (message[field]) {
        let phone = String(message[field]).replace(/\D/g, '');

        // Se for um ID muito longo, pode ser ID interno
        if (phone.length > 15) {
          continue;
        }

        // Formatar para padrão brasileiro se necessário
        if (phone.length >= 10 && phone.length <= 15) {
          // Remove prefixo internacional se existir
          if (phone.startsWith('55') && phone.length > 11) {
            phone = phone.substring(2);
          }

          // Garante 11 dígitos para celulares brasileiros
          if (phone.length === 10) {
            phone = phone.substring(0, 2) + '9' + phone.substring(2);
          }

          return phone;
        }
      }
    }

    return null;
  }

  /**
   * Extrai tipo da mensagem e URL da mídia
   * @param {Object} message - Dados da mensagem
   * @returns {Object} - { contentType, mediaUrl }
   */
  extractMessageType(message) {
    const mediaTypes = ['image', 'audio', 'video', 'document', 'sticker'];

    for (const type of mediaTypes) {
      if (message[type] || message[`${type}Message`] || message.type === type) {
        const mediaUrl = message[type]?.url ||
                        message[`${type}Message`]?.url ||
                        message.mediaUrl ||
                        message.fileUrl ||
                        message.downloadUrl ||
                        null;

        return {
          contentType: type,
          mediaUrl: mediaUrl
        };
      }
    }

    return {
      contentType: 'text',
      mediaUrl: null
    };
  }
}

module.exports = new ChatwootService();
