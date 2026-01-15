const https = require('https');

// --- CONFIGURAÇÃO ---
// Pegue esse token no painel da Focus NFe (Opção "API" no menu)
const TOKEN_FOCUS = 'QB5WjZfI9w4btYBYMOHNikLcPUp80eRn'; 
const AMBIENTE = 'homologacao'; // ou 'producao'

// DADOS DO CLIENTE (TESTE) - Use dados fictícios mas com CPF válido para teste
const clienteTeste = {
    nome: "Cliente Teste Audicare",
    cpf: "04312032106", // Coloque um CPF válido para não dar erro de validação
    email: "gabrieldes@gmail.com", // Seu email para ver se chega
    endereco: {
        logradouro: "Praça dos Três Poderes",
        numero: "1",
        bairro: "Zona Cívico-Administrativa",
        codigo_municipio: "5300108", // Código IBGE de Brasília
        municipio: "Brasília",
        uf: "DF",
        cep: "70100000"
    }
};

// DADOS DA NOTA (Venda de Aparelho - NF-e)
const notaTeste = {
    natureza_operacao: "Venda de Mercadoria",
    data_emissao: new Date().toISOString().split('T')[0],
    tipo_documento: 1, // 1 = Saída
    finalidade_emissao: 1, // 1 = Normal
    consumidor_final: 1, // Sim
    presenca_comprador: 1, // Operação presencial
    
    // Itens da Nota
    items: [
        {
            numero_item: 1,
            codigo_produto: "AP001",
            descricao: "Aparelho Auditivo Teste",
            codigo_ncm: "90214000", // NCM de Aparelhos Auditivos
            cfop: "5102", // Venda de mercadoria
            unidade_comercial: "UN",
            quantidade_comercial: 1,
            valor_unitario_comercial: 100.00, // Valor baixo para teste
            valor_bruto: 100.00,
            unidade_tributavel: "UN",
            quantidade_tributavel: 1,
            valor_unitario_tributavel: 100.00,
            icms_origem: 0, // 0 = Nacional
            icms_situacao_tributaria: "102", // Simples Nacional (se a clínica for)
        }
    ],
    
    cliente: clienteTeste
};

// FUNÇÃO DE ENVIO
function emitirNotaTeste() {
    console.log(`🚀 Enviando teste para Focus NFe (${AMBIENTE})...`);

    const data = JSON.stringify(notaTeste);
    
    // Autenticação Basic Auth (Token + :)
    const auth = Buffer.from(TOKEN_FOCUS + ":").toString('base64');

    const options = {
        hostname: AMBIENTE === 'producao' ? 'api.focusnfe.com.br' : 'homologacao.focusnfe.com.br',
        path: '/v2/nfe?cnpj=45582340000106&ref=' + Date.now(), // ref único para cada tentativa
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {
        console.log(`📡 Status Code: ${res.statusCode}`);
        
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(responseBody);
                console.log('\n🔍 RESPOSTA DA FOCUS:');
                console.dir(json, { depth: null, colors: true });

                if (res.statusCode === 200 || res.statusCode === 202) {
                    console.log('\n✅ SUCESSO! A nota foi recebida e está sendo processada.');
                } else {
                    console.log('\n❌ ERRO: Verifique as mensagens acima.');
                }
            } catch (e) {
                console.log('Resposta bruta:', responseBody);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Erro de conexão:', error);
    });

    req.write(data);
    req.end();
}

emitirNotaTeste();