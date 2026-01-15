const https = require('https');

// ⚠️ SUBSTITUA PELA SUA CHAVE NOVA AQUI
const API_KEY = "AIzaSyA5Mn-uD8AFG8T7m4TbpPkyjGsruveF1to";

function listarModelos() {
    console.log("🔍 Perguntando ao Google quais modelos você pode usar...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const json = JSON.parse(data);
            
            if (json.error) {
                console.log("\n❌ ERRO NA CONTA/CHAVE:");
                console.log(`Código: ${json.error.code}`);
                console.log(`Mensagem: ${json.error.message}`);
                console.log("\n💡 DICA: Verifique se a 'Generative Language API' está ativada no Google Cloud Console.");
            } else if (json.models) {
                console.log("\n✅ SUCESSO! Modelos disponíveis para sua chave:");
                json.models.forEach(m => {
                    // Filtra só os Gemini para facilitar a leitura
                    if (m.name.includes('gemini')) {
                        console.log(`👉 ${m.name.replace('models/', '')}`);
                    }
                });
            } else {
                console.log("\n⚠️ A chave funcionou, mas a lista de modelos veio vazia (estranho).");
                console.log(json);
            }
        });
    }).on('error', (err) => {
        console.error("Erro de conexão:", err.message);
    });
}

listarModelos();