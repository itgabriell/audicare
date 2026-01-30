const https = require('https');
const querystring = require('querystring');

// --- SUAS CREDENCIAIS ---
const CLIENT_ID = '0Dsa7GdxvcG3JITcSeAf';
const CLIENT_SECRET = '7SyPtnHFOtan0e4sbA5VFNiOXU4SbwD2CQSH3UZM';

// Função para pegar o Token de Acesso (Login)
function autenticar() {
    return new Promise((resolve, reject) => {
        console.log('🔐 Autenticando na Nuvem Fiscal...');

        const postData = querystring.stringify({
            'grant_type': 'client_credentials',
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'scope': 'cep empresa nfe nfse' // Pedindo permissão para tudo
        });

        const options = {
            hostname: 'auth.nuvemfiscal.com.br',
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                if (res.statusCode === 200 && json.access_token) {
                    console.log('✅ Token recebido com sucesso!');
                    resolve(json.access_token);
                } else {
                    reject(`Falha na autenticação: ${JSON.stringify(json)}`);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

// Função de Teste (Consultar um CEP para ver se a API responde)
function testarConexao(token) {
    console.log('\n📡 Testando conexão com a API (Consultando CEP)...');
    
    const options = {
        hostname: 'api.nuvemfiscal.com.br',
        path: '/cep/70100000', // CEP de Brasília
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            const json = JSON.parse(data);
            
            if (res.statusCode === 200) {
                console.log('✅ SUCESSO! A API respondeu corretamente.');
                console.log(`📍 Resultado: ${json.logradouro}, ${json.bairro} - ${json.localidade}/${json.uf}`);
                console.log('\n🚀 Conclusão: Credenciais válidas. Podemos integrar a emissão de nota!');
            } else {
                console.log('❌ Erro na consulta:', json);
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.end();
}

// Executa o fluxo
async function rodar() {
    try {
        const token = await autenticar();
        testarConexao(token);
    } catch (erro) {
        console.error('❌ Erro Fatal:', erro);
    }
}

rodar();