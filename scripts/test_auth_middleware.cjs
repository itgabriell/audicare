
const axios = require('axios');

async function testAuth() {
    const backendUrl = 'http://localhost:4001';
    const endpoints = [
        // Rotas protegidas
        '/api/automations',
        '/api/patients/search-by-phone?phone=5511999999999'
    ];

    console.log("--- TEST DE AUTENTICAÇÃO ---");

    for (const endpoint of endpoints) {
        console.log(`\nTesting: ${endpoint}`);

        // 1. Sem chave -> Deve falhar (401)
        try {
            await axios.get(`${backendUrl}${endpoint}`);
            console.error("❌ FALHA: Acesso permitido sem chave!");
        } catch (error) {
            if (error.response?.status === 401) {
                console.log("✅ SUCESSO: Bloqueado sem chave (401)");
            } else {
                console.error(`❌ Erro inesperado: ${error.message} (Status: ${error.response?.status})`);
            }
        }

        // 2. Com chave -> Deve passar (200 ou outro erro de negócio, mas não 401)
        try {
            // Usa a chave que acabamos de gerar
            const headers = { 'x-api-key': '3825f594574d77dd851e55cb07bd7a55b8c3604f150de80ee223b78bca83d731' };
            await axios.get(`${backendUrl}${endpoint}`, { headers });
            console.log("✅ SUCESSO: Acesso permitido com chave");
        } catch (error) {
            if (error.response?.status === 401) {
                console.error("❌ FALHA: Bloqueado mesmo com chave válida!");
            } else {
                // Se der outro erro (ex: 500 ou 404), significa que passou pelo Auth Middleware
                console.log(`✅ SUCESSO: Auth passou (Erro de negócio esperado: ${error.response?.status})`);
            }
        }
    }
}

testAuth();
