require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 4000;

// --- IMPORTAÇÕES ---

// 1. Rotas do Chatwoot (Webhook)
// Verifique se o arquivo existe nessa pasta!
const webhookRoutes = require('./routes/webhookRoutes.cjs');

// 2. NOVAS ROTAS: Integração Chatwoot
const patientRoutes = require('./routes/patientRoutes.cjs');
const supabaseWebhookRoutes = require('./routes/supabaseWebhookRoutes.cjs');

console.log('✅ Patient routes loaded:', typeof patientRoutes);
console.log('✅ Supabase webhook routes loaded:', typeof supabaseWebhookRoutes);

// 3. Serviço de Automação (NOVO)
// Tenta importar do caminho padrão. Se der erro de "module not found",
// verifique se o arquivo está em ./services ou ./backend/services
let patientEngagementAutomation;
try {
    patientEngagementAutomation = require('./services/PatientEngagementAutomation.js');
} catch (e) {
    console.warn("⚠️ Aviso: Tentando caminho alternativo para PatientEngagementAutomation...");
    try {
        patientEngagementAutomation = require('./backend/services/PatientEngagementAutomation.js');
    } catch (e2) {
        console.error("❌ ERRO CRÍTICO: Não foi possível encontrar o arquivo PatientEngagementAutomation.js nem em ./services nem em ./backend/services");
    }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' })); // Aumentei o limite para mídias grandes
app.use(express.urlencoded({ extended: true }));

// --- ROTAS DE SAÚDE ---
app.get('/', (req, res) => res.send('🚀 Adapter Chatwoot <-> Uazapi is Running!'));
app.get('/health', (req, res) => res.json({ status: 'online' }));

// --- LIGANDO O MOTOR NOVO (Webhooks) ---
// Isso habilita: POST /webhooks/whatsapp e POST /webhooks/chatwoot
app.use('/', webhookRoutes);

// --- NOVAS ROTAS: Integração Chatwoot ---
app.use('/api/patients', patientRoutes);
app.use('/webhooks/supabase', supabaseWebhookRoutes);

// ========================================================
// --- NOVAS ROTAS DE AUTOMAÇÃO (INSERIDO AGORA) ---
// ========================================================

// 1. Testar automações manualmente (ex: disparar aniversário agora)
app.post('/api/automation/test/:type', async (req, res) => {
  try {
    if (!patientEngagementAutomation) throw new Error("Serviço de automação não carregado.");
    const { type } = req.params;
    const { phone, data } = req.body;

    const result = await patientEngagementAutomation.testAutomation(type, phone, data);
    res.json(result);
  } catch (error) {
    console.error('❌ Erro no teste de automação:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Buscar configurações atuais
app.get('/api/automation/settings', async (req, res) => {
  try {
    if (!patientEngagementAutomation) throw new Error("Serviço de automação não carregado.");
    const settings = patientEngagementAutomation.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('❌ Erro ao obter configurações:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Atualizar configurações (Ativar/Desativar recursos)
app.put('/api/automation/settings', async (req, res) => {
  try {
    if (!patientEngagementAutomation) throw new Error("Serviço de automação não carregado.");
    const newSettings = req.body;
    patientEngagementAutomation.updateSettings(newSettings);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Trigger para mudança de status de agendamento (Chegou/Saiu)
app.post('/api/automation/appointment-status/:appointmentId', async (req, res) => {
  try {
    if (!patientEngagementAutomation) throw new Error("Serviço de automação não carregado.");
    const { appointmentId } = req.params;
    const { newStatus, oldStatus } = req.body;

    const result = await patientEngagementAutomation.processAppointmentStatusChange(appointmentId, newStatus, oldStatus);
    res.json(result);
  } catch (error) {
    console.error('❌ Erro no processamento de status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================
// --- INICIALIZAÇÃO ---
// ========================================================
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`📡 Webhooks: http://localhost:${PORT}/webhooks/whatsapp`);
    console.log(`🤖 Automações: http://localhost:${PORT}/api/automation/settings`);
    console.log(`🔄 Integração Chatwoot: http://localhost:${PORT}/api/patients/search-by-phone`);
});
