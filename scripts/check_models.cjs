// scripts/check_models.js
const https = require('https');

// COLOQUE SUA API KEY AQUI PARA TESTAR
const API_KEY = "AIzaSyAe2x_SpUp4nBGFbTwlrOBExa-II73O6rM";

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        if (json.error) {
            console.error("❌ ERRO NA CONTA GOOGLE:", json.error.message);
            console.log("👉 Provável solução: Ativar 'Generative Language API' no Google Cloud Console.");
        } else {
            console.log("✅ Modelos Disponíveis para esta Key:");
            console.log(json.models?.map(m => m.name.replace('models/', '')) || "Nenhum modelo encontrado.");
        }
    });
}).on('error', (e) => {
    console.error("Erro de conexão:", e);
});