const axios = require('axios');

const url = 'https://audicare.uazapi.com/send/text';
const token = 'c1bd63dc-e1c4-4956-bd0b-e277bb59dc38';
const number = '5561985155358';
const message = 'Teste Direto Node.js';

async function test() {
    console.log('Testando envio direto...');
    console.log(`URL: ${url}`);
    console.log(`Token: ${token}`);

    try {
        const response = await axios.post(url, {
            number: number,
            text: message
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': token
            }
        });
        console.log('✅ Sucesso:', response.data);
    } catch (error) {
        console.error('❌ Erro:', error.response ? error.response.data : error.message);
        console.error('Status:', error.response?.status);
    }
}

test();
