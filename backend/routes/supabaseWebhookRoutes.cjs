const express = require('express');
const router = express.Router();
const chatwootServiceSync = require('./ChatwootServiceSync.js');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (igual ao index.js)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [SupabaseWebhookRoutes] SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /webhooks/supabase/patient-changes
 * Webhook para mudanças em pacientes (via Supabase triggers)
 */
router.post('/patient-changes', async (req, res) => {
  try {
    console.log('🔗 [Supabase Webhook] Recebido webhook de mudança em paciente');

    const { event_type, patient_id, patient_data, changed_fields } = req.body;

    // Log da mudança
    console.log(`📝 [Supabase Webhook] Paciente ${patient_id}: ${event_type}`);

    // Para INSERT e UPDATE, sincronizar com Chatwoot
    if (event_type === 'INSERT' || event_type === 'UPDATE') {
      // Extrair telefone do paciente
      const phone = patient_data.phone;
      if (phone) {
        console.log(`🔄 [Supabase Webhook] Sincronizando paciente ${patient_data.name} (${phone})`);

        const syncResult = await chatwootServiceSync.syncContactWithPatient(phone);

        if (syncResult.success) {
          console.log(`✅ [Supabase Webhook] Sincronização realizada com sucesso`);
        } else {
          console.log(`⚠️ [Supabase Webhook] Falha na sincronização: ${syncResult.reason || syncResult.error}`);
        }
      } else {
        console.log(`⚠️ [Supabase Webhook] Paciente sem telefone, pulando sincronização`);
      }
    }

    // Para DELETE, poderíamos remover do Chatwoot, mas por segurança vamos apenas logar
    if (event_type === 'DELETE') {
      console.log(`🗑️ [Supabase Webhook] Paciente ${patient_id} removido - considere limpeza manual no Chatwoot`);
    }

    res.json({ success: true, message: 'Patient change processed' });

  } catch (error) {
    console.error('❌ [Supabase Webhook] Erro ao processar mudança de paciente:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /webhooks/supabase/patient-phone-changes
 * Webhook para mudanças em telefones de pacientes
 */
router.post('/patient-phone-changes', async (req, res) => {
  try {
    console.log('🔗 [Supabase Webhook] Recebido webhook de mudança em telefone de paciente');

    const { event_type, patient_id, phone_data } = req.body;

    console.log(`📝 [Supabase Webhook] Telefone do paciente ${patient_id}: ${event_type}`);

    // Para INSERT e UPDATE de telefones WhatsApp, sincronizar
    if ((event_type === 'INSERT' || event_type === 'UPDATE') && phone_data.is_whatsapp) {
      const phone = phone_data.phone;
      if (phone) {
        console.log(`🔄 [Supabase Webhook] Sincronizando telefone WhatsApp ${phone}`);

        const syncResult = await chatwootServiceSync.syncContactWithPatient(phone);

        if (syncResult.success) {
          console.log(`✅ [Supabase Webhook] Sincronização de telefone realizada com sucesso`);
        } else {
          console.log(`⚠️ [Supabase Webhook] Falha na sincronização de telefone: ${syncResult.reason || syncResult.error}`);
        }
      }
    }

    res.json({ success: true, message: 'Patient phone change processed' });

  } catch (error) {
    console.error('❌ [Supabase Webhook] Erro ao processar mudança de telefone:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /webhooks/supabase/patient-address-changes
 * Webhook para mudanças em endereços de pacientes
 */
router.post('/patient-address-changes', async (req, res) => {
  try {
    console.log('🔗 [Supabase Webhook] Recebido webhook de mudança em endereço de paciente');

    const { event_type, patient_id, address_data } = req.body;

    console.log(`📝 [Supabase Webhook] Endereço do paciente ${patient_id}: ${event_type}`);

    // Por enquanto, apenas logar mudanças de endereço
    // Futuramente poderíamos atualizar atributos customizados no Chatwoot
    console.log(`🏠 [Supabase Webhook] Endereço ${event_type} para paciente ${patient_id}`);

    res.json({ success: true, message: 'Patient address change processed' });

  } catch (error) {
    console.error('❌ [Supabase Webhook] Erro ao processar mudança de endereço:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /webhooks/supabase/test
 * Endpoint para testar webhooks
 */
router.post('/test', (req, res) => {
  console.log('🧪 [Supabase Webhook] Teste recebido:', req.body);

  res.json({
    success: true,
    message: 'Supabase webhook test endpoint',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /webhooks/supabase/health
 * Endpoint de saúde para webhooks do Supabase
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Supabase-Webhook-Handler',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /webhooks/supabase/patient-changes - Handles patient data changes',
      'POST /webhooks/supabase/patient-phone-changes - Handles patient phone changes',
      'POST /webhooks/supabase/patient-address-changes - Handles patient address changes',
      'POST /webhooks/supabase/test - Test endpoint'
    ]
  });
});

module.exports = router;
