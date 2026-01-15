const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { AutomationService } = require('../src/services/automationService');

const router = express.Router();

// Middleware para verificar autenticação (opcional para cron jobs)
const verifyCronAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET_KEY;

    // Se não há segredo configurado, permite qualquer requisição (desenvolvimento)
    if (!cronSecret) {
        return next();
    }

    // Verifica se o token de autorização corresponde
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized - Invalid cron secret'
        });
    }

    next();
};

/**
 * Executa todas as automações automáticas
 * Endpoint: POST /api/automations/execute-automatic
 * Pode ser chamado por cron jobs ou webhooks
 */
router.post('/execute-automatic', verifyCronAuth, async (req, res) => {
    try {
        console.log('[Automation Scheduler] Starting automatic automation execution...');

        // Configurar cliente Supabase (se necessário)
        // Nota: O AutomationService já cria seu próprio cliente Supabase

        const results = await AutomationService.executeAutomaticTriggers();

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`[Automation Scheduler] Completed: ${successful} successful, ${failed} failed`);

        res.json({
            success: true,
            message: 'Automatic automations executed successfully',
            timestamp: new Date().toISOString(),
            results: {
                total: results.length,
                successful,
                failed,
                details: results
            }
        });

    } catch (error) {
        console.error('[Automation Scheduler] Error executing automatic automations:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to execute automatic automations',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Executa uma automação específica (para testes)
 * Endpoint: POST /api/automations/:id/execute
 */
router.post('/:id/execute', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body; // ID do usuário que está executando

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        console.log(`[Automation Scheduler] Executing automation ${id} for user ${userId}`);

        const result = await AutomationService.executeAutomation(id, userId, 'manual');

        res.json({
            success: true,
            message: 'Automation executed successfully',
            result
        });

    } catch (error) {
        console.error(`[Automation Scheduler] Error executing automation ${req.params.id}:`, error);

        res.status(500).json({
            success: false,
            error: 'Failed to execute automation',
            message: error.message
        });
    }
});

/**
 * Lista execuções de uma automação
 * Endpoint: GET /api/automations/:id/executions
 */
router.get('/:id/executions', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;

        const executions = await AutomationService.getAutomationExecutions(id, parseInt(limit));

        res.json({
            success: true,
            executions
        });

    } catch (error) {
        console.error(`[Automation Scheduler] Error fetching executions for automation ${req.params.id}:`, error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch executions',
            message: error.message
        });
    }
});

/**
 * Lista todas as automações ativas (para debugging)
 * Endpoint: GET /api/automations/active
 */
router.get('/active', async (req, res) => {
    try {
        const automations = await AutomationService.getActiveAutomations();

        res.json({
            success: true,
            automations
        });

    } catch (error) {
        console.error('[Automation Scheduler] Error fetching active automations:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch active automations',
            message: error.message
        });
    }
});

module.exports = router;
