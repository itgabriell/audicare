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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// --- ROTAS DE SAÚDE ---
app.get('/', (req, res) => res.send('🤖 Audicare Backend (Automation & CRM Sync)'));
app.get('/health', (req, res) => res.json({
    status: 'online',
    mode: 'automation_crm_hybrid',
    automationManager: !!automationManager,
    legacyAutomation: !!patientEngagementAutomation
}));

// --- NOVO: ROTA DE ENVIO DIRETO UAZAPI (Backend-Side) ---
const uazapiClient = require('./lib/uazapiClient.cjs');

app.post('/api/messages/send', async (req, res) => {
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
        // Log para debug
        // console.log('🔄 [Webhook] Evento:', req.body.event);

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
// --- IMPORTAÇÕES EXTENDIDAS ---
const authMiddleware = require('./middleware/authMiddleware.cjs');

// ... (código existente)

// ========================================================
// 🤖 ROTAS DE AUTOMAÇÃO (NOVO SISTEMA COM BANCO)
// ========================================================
if (automationManager) {
    console.log('✅ Registrando rotas de automação...');
    // Aplicar Middleware de Autenticação em automações
    app.use('/api/automations', authMiddleware);

    // Listar automações
    app.get('/api/automations', async (req, res) => {
        try {
            const { clinicId } = req.query;
            if (!clinicId) {
                return res.status(400).json({ error: 'clinicId é obrigatório' });
            }
            const result = await automationManager.getAutomations(clinicId);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro ao listar automações:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Criar automação
    app.post('/api/automations', async (req, res) => {
        try {
            const result = await automationManager.saveAutomation(req.body);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro ao salvar automação:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Atualizar automação
    app.put('/api/automations/:automationId', async (req, res) => {
        try {
            const { automationId } = req.params;
            const result = await automationManager.updateAutomation(automationId, req.body);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro ao atualizar automação:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Remover automação
    app.delete('/api/automations/:automationId', async (req, res) => {
        try {
            const { automationId } = req.params;
            const result = await automationManager.deleteAutomation(automationId);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro ao remover automação:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Testar automação
    app.post('/api/automations/:automationId/test', async (req, res) => {
        try {
            const { automationId } = req.params;
            const { phone } = req.body;
            const result = await automationManager.testAutomation(automationId, phone);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro no teste de automação:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Trigger de Status (Appointment) - Novo sistema
    app.post('/api/automations/appointment-status/:appointmentId', async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { newStatus, oldStatus } = req.body;
            const result = await automationManager.processAppointmentStatusChange(appointmentId, newStatus, oldStatus);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro no processamento de status:', error.message);
            res.status(500).json({ error: error.message });
        }
    });
}

// ========================================================
// 🤖 ROTAS DE AUTOMAÇÃO (LEGACY - MANTER COMPATIBILIDADE)
// ========================================================
if (patientEngagementAutomation) {
    app.post('/api/automation/test/:type', async (req, res) => {
        try {
            const result = await patientEngagementAutomation.testAutomation(req.params.type, req.body.phone, req.body.data);
            res.json(result);
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.get('/api/automation/settings', (req, res) => {
        res.json(patientEngagementAutomation.getSettings());
    });

    app.put('/api/automation/settings', (req, res) => {
        patientEngagementAutomation.updateSettings(req.body);
        res.json({ success: true });
    });

    app.post('/api/automation/appointment-status/:appointmentId', async (req, res) => {
        try {
            const { newStatus, oldStatus } = req.body;
            const result = await patientEngagementAutomation.processAppointmentStatusChange(req.params.appointmentId, newStatus, oldStatus);
            res.json(result);
        } catch (error) { res.status(500).json({ error: error.message }); }
    });
}

// ========================================================
// 💬 CHATWOOT PROXY (Backend-Side)
// Bypass de CORS e Edge Functions
// ========================================================
app.post('/api/chatwoot-proxy', async (req, res) => {
    try {
        const { endpoint, method = 'GET', body } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required' });
        }

        const CHATWOOT_BASE_URL = process.env.VITE_CHATWOOT_BASE_URL || process.env.CHATWOOT_BASE_URL || 'https://chat.audicarefono.com.br';
        const ACCOUNT_ID = process.env.VITE_CHATWOOT_ACCOUNT_ID || process.env.CHATWOOT_ACCOUNT_ID || '1';
        const API_TOKEN = process.env.VITE_CHATWOOT_API_TOKEN || process.env.CHATWOOT_API_TOKEN;

        if (!API_TOKEN) {
            console.error('❌ Server misconfiguration: CHATWOOT_API_TOKEN missing');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}${endpoint}`;

        // Use dynamic import for fetch if needed in older Node versions, or global fetch in Node 18+
        // Assuming Node 18+ based on "index(VPS).cjs" context
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

        if (!response.ok) {
            console.error('❌ Chatwoot Error:', response.status, data);
            return res.status(response.status).json({ error: 'Upstream Error', details: data });
        }

        res.json(data);

    } catch (error) {
        console.error('❌ Proxy Fatal Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- START ---
app.listen(PORT, () => {
    console.log(`✅ Backend Audicare rodando na porta ${PORT}`);
    console.log(`🔄 Sync CRM: Ativo em /webhooks/chatwoot-events`);
    console.log(`🤖 Automação Legacy: ${patientEngagementAutomation ? 'Ativa' : 'Inativa'}`);
    console.log(`🤖 AutomationManager: ${automationManager ? 'Ativa' : 'Inativa'}`);
});
