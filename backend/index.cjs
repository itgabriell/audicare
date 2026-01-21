require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 4000;

// --- IMPORTAÇÕES ---
// NOTE QUE REMOVEMOS O webhookRoutes AQUI!
// O sistema não vai mais escutar o WhatsApp nem o Chatwoot para conversas.

// Serviços
let patientEngagementAutomation;
try {
    patientEngagementAutomation = require('./services/PatientEngagementAutomation.js');
} catch (e) {
    console.warn("⚠️ Automação não carregada:", e.message);
}

// --- MIDDLEWARES ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// --- ROTAS DE SAÚDE ---
app.get('/', (req, res) => res.send('🤖 Audicare Automation Brain is Running (Bridge Disabled)'));
app.get('/health', (req, res) => res.json({ status: 'online', mode: 'automation_only' }));

// --- WEBHOOKS DE SINCRONIZAÇÃO CHATWOOT -> CRM ---
// Serviço de sincronização Chatwoot
let chatwootSyncService;
try {
    chatwootSyncService = require('./services/ChatwootSyncService.cjs');
} catch (e) {
    console.warn("⚠️ Serviço de sincronização Chatwoot não carregado:", e.message);
}

// Rota para webhooks de eventos do Chatwoot
app.post('/webhooks/chatwoot-events', async (req, res) => {
    try {
        console.log('🔄 [Webhook] Recebido evento do Chatwoot:', req.body.event);

        if (chatwootSyncService) {
            const result = await chatwootSyncService.handleChatwootEvent(req.body);
            res.json(result);
        } else {
            console.warn('⚠️ [Webhook] Serviço de sincronização não disponível');
            res.status(503).json({ error: 'Chatwoot sync service not available' });
        }
    } catch (error) {
        console.error('❌ [Webhook] Erro no processamento do webhook:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- API DE AUTOMAÇÃO (CRON JOBS & GATILHOS) ---
if (patientEngagementAutomation) {
    // Testar automações
    app.post('/api/automation/test/:type', async (req, res) => {
        try {
            const { type } = req.params;
            const { phone, data } = req.body;
            const result = await patientEngagementAutomation.testAutomation(type, phone, data);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro no teste de automação:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Configurações
    app.get('/api/automation/settings', (req, res) => {
        try {
            res.json(patientEngagementAutomation.getSettings());
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    app.put('/api/automation/settings', (req, res) => {
        try {
            patientEngagementAutomation.updateSettings(req.body);
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    // Trigger de Status (Appointment)
    app.post('/api/automation/appointment-status/:appointmentId', async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { newStatus, oldStatus } = req.body;
            const result = await patientEngagementAutomation.processAppointmentStatusChange(appointmentId, newStatus, oldStatus);
            res.json(result);
        } catch (error) {
            console.error('❌ Erro no processamento de status:', error.message);
            res.status(500).json({ error: error.message });
        }
    });
}

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => {
    console.log(`✅ Cérebro de Automação rodando na porta ${PORT}`);
    console.log(`🔇 Modo Bridge DESATIVADO (Deixando o Uazapi Nativo assumir)`);
});
