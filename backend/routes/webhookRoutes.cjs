const express = require('express');
const router = express.Router();
const chatwootService = require('../services/ChatwootService.cjs');

/**
 * POST /webhooks/whatsapp
 * Webhook para receber mensagens do WhatsApp (Uazapi) e enviar para Chatwoot
 */
router.post('/whatsapp', async (req, res) => {
  try {
    console.log('🔗 [Webhook] Recebido webhook do WhatsApp (Uazapi)');

    const webhookData = req.body;

    // Processar webhook usando o serviço
    const processed = await chatwootService.processWhatsAppWebhook(webhookData);

    if (processed) {
      console.log('✅ [Webhook] Mensagem WhatsApp processada com sucesso');
      res.json({ success: true, message: 'Webhook processed successfully' });
    } else {
      console.log('⏭️ [Webhook] Webhook do WhatsApp ignorado (não era mensagem relevante)');
      res.json({ success: true, message: 'Webhook ignored (not relevant)' });
    }

  } catch (error) {
    console.error('❌ [Webhook] Erro ao processar webhook do WhatsApp:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /webhooks/chatwoot
 * Webhook para receber respostas do Chatwoot e enviar para WhatsApp
 */
router.post('/chatwoot', async (req, res) => {
  try {
    console.log('🔗 [Webhook] Recebido webhook do Chatwoot');

    const webhookData = req.body;

    // Processar webhook usando o serviço
    const processed = await chatwootService.processChatwootWebhook(webhookData);

    if (processed) {
      console.log('✅ [Webhook] Resposta do Chatwoot enviada via WhatsApp');
      res.json({ success: true, message: 'Response sent via WhatsApp' });
    } else {
      console.log('⏭️ [Webhook] Webhook do Chatwoot ignorado (não era resposta relevante)');
      res.json({ success: true, message: 'Webhook ignored (not relevant)' });
    }

  } catch (error) {
    console.error('❌ [Webhook] Erro ao processar webhook do Chatwoot:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /webhooks/health
 * Endpoint de saúde para verificar se os webhooks estão funcionando
 */
router.get('/webhooks/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chatwoot-Webhook-Adapter',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /webhooks/whatsapp - Receives WhatsApp messages from Uazapi',
      'POST /webhooks/chatwoot - Receives responses from Chatwoot'
    ]
  });
});

module.exports = router;
