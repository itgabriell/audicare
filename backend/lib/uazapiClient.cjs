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

        // Payload estritamente conforme documentação e teste validado
        const payload = {
            "number": cleanPhone,
            "text": message
        };

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'token': UAZAPI_API_KEY
        };

        const response = await axios.post(url, payload, { headers });

        console.log('✅ [UAZAPI] Sucesso:', response.data);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.message;
        console.error('❌ [UAZAPI] Erro:', errorMsg);
        throw new Error(errorMsg);
    }
}

module.exports = { sendText };
