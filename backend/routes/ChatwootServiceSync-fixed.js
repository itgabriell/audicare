const axios = require('axios');

// --- DADOS REAIS FIXOS ---
const CHATWOOT_ACCOUNT_ID = 2;
const CHATWOOT_INBOX_ID = 1;
const CHATWOOT_API_URL = 'https://chat.audicarefono.com.br';
const CHATWOOT_API_TOKEN = 'KDBiZy6KSHN7eq2rCkGY6L14';

// --- DADOS DO UAZAPI ---
const UAZAPI_SEND_URL = 'https://audicare.uazapi.com/send/text';
const UAZAPI_API_KEY = 'c1bd63dc-e1c4-4956-bd0b-e277bb59dc38';

// --- URL DA API DO BACKEND AUDICARE ---
const AUDICARE_API_URL = process.env.AUDICARE_API_URL || 'http://localhost:4000';

// --- MEMÓRIA ANTI-DUPLICIDADE ---
const processedMessages = new Set();

const chatwootClient = axios.create({
  baseURL: CHATWOOT_API_URL,
  headers: {
      api_access_token: CHATWOOT_API_TOKEN,
      'Content-Type': 'application/json'
  },
});

// --- FUNÇÃO AUXILIAR DE LIMPEZA ---
function extractPhoneNumber(jid) {
    if (!jid) return null;
    let number = jid.split('@')[0]; // Remove @s.whatsapp.net
    number = number.split(':')[0];  // Remove :12 (device ID)
    number = number.replace(/\D/g, ''); // Remove não-números
    return number;
}

const ChatwootServiceSync = {

  // =================================================================
  // 🔄 SINCRONIZAÇÃO BIDIRECIONAL COM AUDICARE
  // =================================================================

  /**
   * Sincroniza contato do Chatwoot com dados do paciente no Audicare
   * @param {string} phone - Número do telefone
   * @returns {Promise<Object>} - Resultado da sincronização
   */
  async syncContactWithPatient(phone) {
    try {
      console.log(`🔄 [SYNC] Iniciando sincronização para telefone: ${phone}`);

      // 1. Buscar paciente no Audicare via API
      const patientResponse = await axios.get(`${AUDICARE_API_URL}/api/patients/search-by-phone`, {
        params: { phone },
        timeout: 10000
      });

      if (!patientResponse.data.success || !patientResponse.data.patient) {
        console.log(`❌ [SYNC] Paciente não encontrado no Audicare para telefone: ${phone}`);
        return { success: false, reason: 'patient_not_found' };
      }

      const patient = patientResponse.data.patient;
      console.log(`✅ [SYNC] Paciente encontrado: ${patient.name} (ID: ${patient.id})`);

      // 2. Buscar ou criar contato no Chatwoot
      let contact = await this.findContact(phone);

      if (!contact) {
        console.log(`🆕 [SYNC] Criando contato no Chatwoot para: ${patient.name}`);
        contact = await this.createContact(phone, patient.name);

        if (!contact) {
          return { success: false, reason: 'failed_to_create_contact' };
        }
      }

      // 3. Atualizar contato no Chatwoot com dados do paciente
      const updateData = {
        name: patient.name,
        email: patient.email,
        phone_number: patient.whatsapp_phone || patient.primary_phone,
        additional_attributes: {
          patient_id: patient.id,
          birth_date: patient.birth_date,
          tags: patient.tags?.map(tag => tag.name) || [],
          addresses: patient.addresses || []
        }
      };

      const updateResponse = await chatwootClient.put(
        `/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contact.id}`,
        { contact: updateData }
      );

      console.log(`✅ [SYNC] Contato atualizado no Chatwoot: ${contact.id}`);

      return {
        success: true,
        patient: patient,
        contact: updateResponse.data.payload.contact,
        action: 'updated'
      };

    } catch (error) {
      console.error('❌ [SYNC] Erro na sincronização:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // =================================================================
  // 🛠️ MÉTODOS PÚBLICOS (USADOS PELA AUTOMAÇÃO)
  // =================================================================

  async findContact(phone) {
    try {
      const response = await chatwootClient.get(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${phone}`);
      if (response.data.payload && response.data.payload.length > 0) {
        return response.data.payload[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Erro findContact:', error.message);
      return null;
    }
  },

  async createContact(phone, name) {
    try {
      const payload = {
        inbox_id: CHATWOOT_INBOX_ID,
        name: name || phone,
        phone_number: '+' + phone.replace('+', '')
      };
      const response = await chatwootClient.post(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, payload);
      return response.data.payload.contact;
    } catch (error) {
      console.error('❌ Erro createContact:', error.message);
      return null;
    }
  },

  async createConversation(contactId) {
    try {
      // Tenta achar conversa existente (Source ID)
      // Simplificação: tenta criar direto, se der erro busca
      const payload = {
        source_id: contactId, // Uso simplificado, idealmente seria o phone ou ID do banco
        inbox_id: CHATWOOT_INBOX_ID,
        contact_id: contactId
      };

      const response = await chatwootClient.post(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, payload);
      return response.data;
    } catch (error) {
      // Se falhar (ex: conversa já existe), tentamos buscar as abertas
      try {
          const convSearch = await chatwootClient.get(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}/conversations`);
          const openConv = convSearch.data.payload.find(c => c.status === 'open');
          if (openConv) return openConv;

          // Se não tem aberta, retorna null ou tenta forçar
          return null;
      } catch (err) {
          console.error('❌ Erro createConversation:', err.message);
          return null;
      }
    }
  },

  async createMessage(conversationId, content, messageType = 'incoming') {
    try {
      await chatwootClient.post(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, {
        content: content,
        message_type: messageType,
        private: false
      });
      return true;
    } catch (error) {
      console.error('❌ Erro createMessage:', error.message);
      throw error;
    }
  },

  // =================================================================
  // 📥 ENTRADA (WHATSAPP -> CHATWOOT) - VERSÃO SIMPLIFICADA
  // =================================================================
  async handleIncomingMessage(body) {
    try {
        if (!body.message) return;
        const msg = body.message;

        if (msg.fromMe === true || msg.fromMe === 'true') return;

        // Anti-Duplicidade
        const messageId = msg.messageid || msg.id;
        if (messageId && processedMessages.has(messageId)) return;
        if (messageId) {
            processedMessages.add(messageId);
            setTimeout(() => processedMessages.delete(messageId), 120 * 1000);
        }

        const remoteJid = msg.sender || msg.chatid || msg.key?.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) return;

        const phone = extractPhoneNumber(remoteJid);
        const pushName = msg.senderName || msg.pushName || `Cliente ${phone}`;

        let content = '';
        if (typeof msg.text === 'string') content = msg.text;
        else if (msg.content && typeof msg.content.text === 'string') content = msg.content.text;
        else return; // Simplificado para texto por enquanto

        console.log(`✅ RECEBIDO: ${pushName} (${phone}): "${content}"`);

        // Tentar sincronizar com paciente primeiro
        await this.syncContactWithPatient(phone);

        // REUSA OS MÉTODOS PÚBLICOS AGORA
        let contact = await this.findContact(phone);
        if (!contact) {
            contact = await this.createContact(phone, pushName);
        }

        if (contact) {
            let conversation = null;
            try {
                 const convSearch = await chatwootClient.get(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contact.id}/conversations`);
                 conversation = convSearch.data.payload.find(c => c.status === 'open');

                 if (!conversation) {
                     const newConv = await chatwootClient.post(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
                         source_id: `+${phone}`,
                         inbox_id: CHATWOOT_INBOX_ID,
                         contact_id: contact.id
                     });
                     conversation = newConv.data;
                 }
            } catch (e) { console.error('Erro gestão conversa entrada:', e.message); }

            if (conversation) {
                await this.createMessage(conversation.id, content, 'incoming');
                console.log('🚀 Entregue no Chatwoot');
            }
        }

    } catch (error) { console.error('❌ ERRO GERAL:', error.message); }
  },

  // =================================================================
  // 📤 SAÍDA (CHATWOOT -> WHATSAPP) - VERSÃO SIMPLIFICADA
  // =================================================================
  async handleOutgoingMessage(body) {
    try {
        if (body.event !== 'message_created' || body.message_type !== 'outgoing' || body.private) return;

        const contactPhone = body.conversation.meta.sender.phone_number;
        if (!contactPhone) return;

        const targetPhone = contactPhone.replace('+', '');
        console.log(`📤 Enviando para ${targetPhone}...`);

        await axios.post(UAZAPI_SEND_URL, {
            number: targetPhone,
            text: body.content,
            options: { delay: 1200, presence: "composing", linkPreview: true }
        }, {
            headers: {
                'token': UAZAPI_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Enviado via Uazapi!`);
    } catch (error) {
        console.error('❌ Erro envio Uazapi:', error.message);
    }
  }
};

module.exports = ChatwootServiceSync;
