const axios = require('axios');

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://audicare.uazapi.com';
const UAZAPI_API_KEY = process.env.UAZAPI_API_KEY;

/**
 * Envia mensagem texto via Uazapi
 * @param {string} phone - Telefone (55...)
 * @param {string} message - Conteúdo
 */
async function sendText(phone, message) {
    if (!UAZAPI_API_KEY) {
        throw new Error("UAZAPI_API_KEY não configurada no backend (.env)");
    }

    // Normalizar telefone (apenas números)
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
    }

    try {
        const url = `${UAZAPI_URL}/send/text`;
        console.log(`📡 [UAZAPI] Enviando para ${cleanPhone}...`);

        const response = await axios.post(url, {
            phone: cleanPhone,
            message: message
        }, {
            headers: {
                'apikey': UAZAPI_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ [UAZAPI] Sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ [UAZAPI] Erro:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
}

module.exports = { sendText };
