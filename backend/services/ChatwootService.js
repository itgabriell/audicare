const axios = require('axios');
// Usaremos JSON puro com Base64 no campo 'file', conforme sua documentação.

// --- DADOS REAIS FIXOS ---
const CHATWOOT_ACCOUNT_ID = 2;
const CHATWOOT_INBOX_ID = 1;
const CHATWOOT_API_URL = 'https://chat.audicarefono.com.br';
const CHATWOOT_API_TOKEN = 'KDBiZy6KSHN7eq2rCkGY6L14';

// --- DADOS DO UAZAPI ---
const UAZAPI_BASE_URL = 'https://audicare.uazapi.com';
const UAZAPI_API_KEY = 'c1bd63dc-e1c4-4956-bd0b-e277bb59dc38';

// --- MEMÓRIA ANTI-DUPLICIDADE ---
const processedMessages = new Set();

const chatwootClient = axios.create({
  baseURL: CHATWOOT_API_URL,
  headers: {
      api_access_token: CHATWOOT_API_TOKEN,
      'Content-Type': 'application/json'
  },
});

// --- FUNÇÕES AUXILIARES ---
function extractPhoneNumber(jid) {
    if (!jid) return null;
    let number = jid.split('@')[0];
    number = number.split(':')[0];
    number = number.replace(/\D/g, '');
    return number;
}

// Baixar arquivo como Buffer e converter para Base64
async function getBase64FromUrl(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error('❌ Erro ao baixar mídia:', error.message);
        throw error;
    }
}

const ChatwootService = {

  // =================================================================
  // 🛠️ MÉTODOS PÚBLICOS
  // =================================================================

  async findContact(phone) {
    try {
      const response = await chatwootClient.get(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${phone}`);
      if (response.data.payload && response.data.payload.length > 0) {
        return response.data.payload[0];
      }
      return null;
    } catch (error) {
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
      if (error.response && error.response.status === 422) {
         return await this.findContact(phone);
      }
      return null;
    }
  },

  async createConversation(contactId) {
    try {
      const payload = {
        source_id: contactId,
        inbox_id: CHATWOOT_INBOX_ID,
        contact_id: contactId
      };
      const response = await chatwootClient.post(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, payload);
      return response.data;
    } catch (error) {
      try {
          const convSearch = await chatwootClient.get(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}/conversations`);
          const existingConv = convSearch.data.payload.find(c => c.inbox_id === CHATWOOT_INBOX_ID);
          if (existingConv) {
               if (existingConv.status === 'resolved') {
                  await chatwootClient.post(`/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${existingConv.id}/toggle_status`, { status: 'open' });
              }
              return existingConv;
          }
          return null;
      } catch (err) {
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
      throw error;
    }
  },

  // =================================================================
  // 📥 ENTRADA (WHATSAPP -> CHATWOOT)
  // =================================================================
  async handleIncomingMessage(body) {
    try {
        if (!body.message) return;
        const msg = body.message;
        if (msg.fromMe === true || msg.fromMe === 'true') return;

        const messageId = msg.messageid || msg.id;
        if (messageId && processedMessages.has(messageId)) return;
        if (messageId) {
            processedMessages.add(messageId);
            setTimeout(() => processedMessages.delete(messageId), 60 * 1000);
        }

        let targetJid = msg.sender || msg.chatid || msg.key?.remoteJid;
        if (targetJid && (targetJid.includes('@lid') || !targetJid.includes('@s.whatsapp.net'))) {
            if (msg.key && msg.key.remoteJid && msg.key.remoteJid.includes('@s.whatsapp.net')) {
                targetJid = msg.key.remoteJid;
            }
        }
        if (!targetJid || targetJid.includes('@g.us')) return;

        const phone = extractPhoneNumber(targetJid);
        const pushName = msg.senderName || msg.pushName || `Cliente ${phone}`;

        let content = '';
        if (typeof msg.text === 'string') content = msg.text;
        else if (msg.content && typeof msg.content.text === 'string') content = msg.content.text;
        else if (msg.messageType === 'imageMessage' || msg.type === 'image') content = '📸 [Imagem recebida]';
        else if (msg.messageType === 'audioMessage' || msg.type === 'audio') content = '🎤 [Áudio recebido]';
        else return;

        console.log(`✅ RECEBIDO: ${pushName} (${phone})`);

        let contact = await this.findContact(phone);
        if (!contact) {
            contact = await this.createContact(phone, pushName);
        }

        if (contact) {
            let conversation = await this.createConversation(contact.id);
            if (conversation) {
                await this.createMessage(conversation.id, content, 'incoming');
                console.log('🚀 Entregue no Chatwoot');
            }
        }

    } catch (error) { console.error('❌ ERRO GERAL ENTRADA:', error.message); }
  },

  // =================================================================
  // 📤 SAÍDA (CHATWOOT -> WHATSAPP) - VERSÃO UAZAPI DOCS COMPLIANT ✅
  // =================================================================
  async handleOutgoingMessage(body) {
    try {
        if (body.event !== 'message_created' || body.message_type !== 'outgoing' || body.private) return;

        const cwMessageId = body.id;
        if (cwMessageId && processedMessages.has(cwMessageId)) return;
        if (cwMessageId) {
            processedMessages.add(cwMessageId);
            setTimeout(() => processedMessages.delete(cwMessageId), 60 * 1000);
        }

        const contactPhone = body.conversation.meta.sender.phone_number;
        if (!contactPhone) return;
        const targetPhone = contactPhone.replace('+', '');

        console.log(`📤 Processando envio para ${targetPhone}...`);

        if (body.attachments && body.attachments.length > 0) {
            const attachment = body.attachments[0];
            const fileUrl = attachment.data_url;
            const isAudio = attachment.file_type === 'audio';

            console.log(`📎 Baixando: ${attachment.file_type} para Base64`);

            // 1. Baixar e Converter
            const rawBase64 = await getBase64FromUrl(fileUrl);
            const mimeType = isAudio ? 'audio/mpeg' : (attachment.content_type || 'image/jpeg');
            const fullBase64 = `data:${mimeType};base64,${rawBase64}`;

            // 2. Definir Tipo conforme Documentação
            // 'ptt' é o padrão para mensagem de voz (microfone azul)
            // 'image' para imagens
            const type = isAudio ? 'ptt' : 'image';

            console.log(`📦 Enviando conforme Doc Uazapi (Campo 'file', Tipo '${type}')...`);

            // 3. Payload exato da documentação fornecida
            const payload = {
                number: targetPhone,
                type: type,          // Doc: "type" (image, ptt, audio...)
                file: fullBase64,    // Doc: "file" (URL ou base64) - AQUI ESTAVA O ERRO!
                delay: 1200,         // Doc: "delay" (integer, top-level)
                mimetype: mimeType   // Doc: "mimetype" (opcional, mas bom mandar)
            };

            // Adiciona legenda apenas se existir
            if (body.content) {
                payload.text = body.content; // Doc: "text" (caption)
            }

            await axios.post(`${UAZAPI_BASE_URL}/send/media`, payload, {
                headers: { 'token': UAZAPI_API_KEY, 'Content-Type': 'application/json' },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

        } else {
            // TEXTO NORMAL
            await axios.post(`${UAZAPI_BASE_URL}/send/text`, {
                number: targetPhone,
                text: body.content,
                delay: 1200
            }, {
                headers: { 'token': UAZAPI_API_KEY, 'Content-Type': 'application/json' }
            });
        }

        console.log(`✅ Enviado com sucesso via Uazapi!`);

    } catch (error) {
        console.error('❌ Erro envio Uazapi:', error.message);
        if (error.response) console.error('🔍 Detalhes:', JSON.stringify(error.response.data));
    }
  }
};

module.exports = ChatwootService;
