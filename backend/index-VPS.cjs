require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 4000;

// --- IMPORTAÇÕES ---
// Carregamento resiliente dos serviços
let patientEngagementAutomation;
let automationManager;
let chatwootSyncService;

// Manter compatibilidade com automação antiga
try {
    patientEngagementAutomation = require('./services/PatientEngagementAutomation.cjs');
} catch (e) {
    console.warn("⚠️ Automação antiga não carregada:", e.message);
}

// Novo sistema de automação
try {
    console.log('🔄 Tentando carregar AutomationManager...');
    automationManager = require('./services/AutomationManager.cjs');
    console.log('✅ Carregado. Tipo:', typeof automationManager);
} catch (e) {
    console.warn("⚠️ AutomationManager não carregado. Erro:", e);
    console.warn("⚠️ Stack:", e.stack);
}

// Serviço de sincronização Chatwoot
try {
    chatwootSyncService = require('./services/ChatwootSyncService.cjs');
} catch (e) {
    console.warn("⚠️ Sync Service não carregado:", e.message);
}

// --- MIDDLEWARES ---

// 1. LOGGING DE DEBUG (Essencial para diagnosticar se a requisição chega)
app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
    next();
});

// 2. CONFIGURAÇÃO CORS "BLINDADA"
// Aceita qualquer origem dinamicamente. Resolve problemas com Load Balancers e Proxies.
const corsOptions = {
    origin: function (origin, callback) {
        // null = requisição server-to-server ou mobile. true = aceita o que vier.
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'api_access_token', 'x-api-key'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// A linha abaixo causava erro em versões novas do Express/path-to-regexp
// app.options('*', cors(corsOptions)); 
// O middleware acima já deve tratar OPTIONS se configurado corretamente.

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// --- ROTAS DE SAÚDE ---
app.get('/', (req, res) => res.send('🤖 Audicare Backend (CORS FIX APPLIED)'));
app.get('/health', (req, res) => res.json({
    status: 'online',
    mode: 'automation_crm_hybrid',
    automationManager: !!automationManager,
    legacyAutomation: !!patientEngagementAutomation,
    cors: 'permissive'
}));

// --- NOVO: ROTA DE ENVIO DIRETO UAZAPI (Backend-Side) ---
let uazapiClient;
try {
    uazapiClient = require('./lib/uazapiClient.cjs');
} catch (e) {
    console.warn("⚠️ uazapiClient não encontrado. Rota de envio direto será desativada.");
}

app.post('/api/messages/send', async (req, res) => {
    if (!uazapiClient) return res.status(503).json({ error: 'Serviço de mensageria indisponível (Lib missing)' });

    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
        }

        const result = await uazapiClient.sendText(phone, message);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erro rota mensageria:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================
// 🔄 WEBHOOKS DE SINCRONIZAÇÃO (CHATWOOT -> CRM)
// ========================================================
app.post('/webhooks/chatwoot-events', async (req, res) => {
    try {
        if (chatwootSyncService) {
            const result = await chatwootSyncService.handleChatwootEvent(req.body);
            res.json(result);
        } else {
            res.status(503).json({ error: 'Sync service offline' });
        }
    } catch (error) {
        console.error('❌ [Webhook] Erro:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================
// 🤖 ROTAS DE AUTOMAÇÃO (NOVO SISTEMA COM BANCO)
// ========================================================
const authMiddleware = require('./middleware/authMiddleware.cjs');

if (automationManager) {
    console.log('✅ Registrando rotas de automação...');

    // Middleware de Debug para Automações - Loga TUDO que chega aqui
    app.use('/api/automations', (req, res, next) => {
        console.log(`📡 [API REQUEST] ${req.method} ${req.originalUrl}`);
        console.log(`   Headers: x-api-key=${req.headers['x-api-key'] ? 'PRESENT (' + req.headers['x-api-key'].substring(0, 3) + '...)' : 'MISSING'}`);
        next();
    });

    app.use('/api/automations', authMiddleware);

    app.get('/api/automations', async (req, res) => {
        try {
            const { clinicId } = req.query;
            if (!clinicId) return res.status(400).json({ error: 'clinicId é obrigatório' });
            res.json(await automationManager.getAutomations(clinicId));
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/automations', async (req, res) => {
        try { res.json(await automationManager.saveAutomation(req.body)); }
        catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.put('/api/automations/:automationId', async (req, res) => {
        try { res.json(await automationManager.updateAutomation(req.params.automationId, req.body)); }
        catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.delete('/api/automations/:automationId', async (req, res) => {
        try { res.json(await automationManager.deleteAutomation(req.params.automationId)); }
        catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/automations/:automationId/test', async (req, res) => {
        try { res.json(await automationManager.testAutomation(req.params.automationId, req.body.phone)); }
        catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/automations/:automationId/execute', async (req, res) => {
        try {
            const result = await automationManager.executeAutomation(req.params.automationId);
            res.json(result);
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/automations/appointment-status/:appointmentId', async (req, res) => {
        try {
            const { newStatus, oldStatus } = req.body;
            res.json(await automationManager.processAppointmentStatusChange(req.params.appointmentId, newStatus, oldStatus));
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.post('/api/automations/appointment-created/:appointmentId', async (req, res) => {
        try {
            res.json(await automationManager.processAppointmentCreated(req.params.appointmentId));
        } catch (error) { res.status(500).json({ error: error.message }); }
    });
}

// ========================================================
// 🤖 ROTAS DE AUTOMAÇÃO (LEGACY)
// ========================================================
if (patientEngagementAutomation) {
    app.post('/api/automation/test/:type', async (req, res) => {
        try { res.json(await patientEngagementAutomation.testAutomation(req.params.type, req.body.phone, req.body.data)); }
        catch (error) { res.status(500).json({ error: error.message }); }
    });
    app.get('/api/automation/settings', (req, res) => res.json(patientEngagementAutomation.getSettings()));
    app.put('/api/automation/settings', (req, res) => {
        patientEngagementAutomation.updateSettings(req.body);
        res.json({ success: true });
    });
    app.post('/api/automation/appointment-status/:appointmentId', async (req, res) => {
        try {
            const { newStatus, oldStatus } = req.body;
            res.json(await patientEngagementAutomation.processAppointmentStatusChange(req.params.appointmentId, newStatus, oldStatus));
        } catch (error) { res.status(500).json({ error: error.message }); }
    });
}

// ========================================================
// 💬 CHATWOOT PROXY (Backend-Side)
// Bypass de CORS e Edge Functions
// ========================================================
app.post('/api/chatwoot-proxy', async (req, res) => {
    console.log('[PROXY] 📩 Request received for:', req.body?.endpoint);
    try {
        const { endpoint, method = 'GET', body } = req.body;
        if (!endpoint) return res.status(400).json({ error: 'Endpoint is required' });

        const CHATWOOT_BASE_URL = process.env.VITE_CHATWOOT_BASE_URL || process.env.CHATWOOT_BASE_URL || 'https://chat.audicarefono.com.br';
        const ACCOUNT_ID = process.env.VITE_CHATWOOT_ACCOUNT_ID || process.env.CHATWOOT_ACCOUNT_ID || '2';
        const API_TOKEN = process.env.VITE_CHATWOOT_API_TOKEN || process.env.CHATWOOT_API_TOKEN;

        if (!API_TOKEN) {
            console.error('❌ Server misconfiguration: CHATWOOT_API_TOKEN missing');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}${endpoint}`;
        console.log(`[PROXY] ➡️ Forwarding to: ${url}`);

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': API_TOKEN
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        console.log(`[PROXY] ⬅️ Upstream Response: ${response.status}`);

        if (!response.ok) {
            console.error('❌ Chatwoot Error Details:', typeof data === 'object' ? JSON.stringify(data) : data);
            return res.status(response.status).json({ error: 'Upstream Error', details: data });
        }

        res.json(data);

    } catch (error) {
        console.error('❌ Proxy Fatal Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend Audicare rodando na porta ${PORT}`);
});
