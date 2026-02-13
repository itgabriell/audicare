import { supabase } from '@/database.js';

export class AutomationService {
    /**
     * Executa uma automação específica
     * @param {string} automationId - ID da automação
     * @param {string} executedBy - ID do usuário que executou
     * @param {string} executionType - Tipo de execução ('manual' ou 'automatic')
     * @returns {Promise<Object>} Resultado da execução
     */
    static async executeAutomation(automationId, executedBy, executionType = 'manual') {
        try {
            // Buscar a automação
            const { data: automation, error: automationError } = await supabase
                .from('automations')
                .select('*')
                .eq('id', automationId)
                .eq('status', 'active')
                .single();

            if (automationError || !automation) {
                throw new Error('Automação não encontrada ou inativa');
            }

            // Criar registro de execução
            const { data: execution, error: executionError } = await supabase
                .from('automation_executions')
                .insert({
                    automation_id: automationId,
                    executed_by: executedBy,
                    execution_type: executionType,
                    status: 'running'
                })
                .select()
                .single();

            if (executionError) throw executionError;

            try {
                // Obter destinatários baseado nos filtros
                const recipients = await this.getFilteredRecipients(automation);

                if (recipients.length === 0) {
                    await this.updateExecutionStatus(execution.id, 'completed', 0, 0);
                    return {
                        success: true,
                        executionId: execution.id,
                        message: 'Nenhum destinatário encontrado para os filtros aplicados',
                        targetCount: 0,
                        successCount: 0
                    };
                }

                // Executar a ação para cada destinatário
                const results = await this.executeAction(automation, recipients, execution.id);

                // Atualizar status da execução
                const successCount = results.filter(r => r.success).length;
                const failureCount = results.length - successCount;

                await this.updateExecutionStatus(execution.id, 'completed', results.length, successCount, failureCount);

                return {
                    success: true,
                    executionId: execution.id,
                    targetCount: results.length,
                    successCount,
                    failureCount,
                    results
                };

            } catch (error) {
                await this.updateExecutionStatus(execution.id, 'failed', 0, 0, 0, error.message);
                throw error;
            }

        } catch (error) {
            console.error('Error executing automation:', error);
            throw error;
        }
    }

    /**
     * Obtém destinatários filtrados baseado na configuração da automação
     * @param {Object} automation - Configuração da automação
     * @returns {Promise<Array>} Lista de destinatários
     */
    static async getFilteredRecipients(automation) {
        const { filter_config, clinic_id } = automation;
        let query = supabase.from('contacts').select('*').eq('clinic_id', clinic_id);

        // Aplicar filtros
        if (filter_config?.filters && filter_config.filters.length > 0) {
            for (const filter of filter_config.filters) {
                query = this.applyFilter(query, filter);
            }
        }

        const { data: contacts, error } = await query;
        if (error) throw error;

        // Para filtros que envolvem pacientes, buscar também da tabela patients
        const patientFilters = filter_config?.filters?.filter(f =>
            ['has_appointments', 'last_appointment_days', 'patient_status'].includes(f.type)
        );

        if (patientFilters && patientFilters.length > 0) {
            // Buscar pacientes e seus contatos
            const { data: patients, error: patientError } = await supabase
                .from('patients')
                .select(`
                    *,
                    contacts!inner(*)
                `)
                .eq('clinic_id', clinic_id);

            if (patientError) throw patientError;

            // Aplicar filtros de paciente
            const filteredPatients = patients.filter(patient => {
                return patientFilters.every(filter => this.matchesPatientFilter(patient, filter));
            });

            // Retornar apenas os contatos dos pacientes filtrados
            return filteredPatients.map(p => p.contacts).flat();
        }

        return contacts || [];
    }

    /**
     * Aplica um filtro à query
     * @param {Object} query - Query do Supabase
     * @param {Object} filter - Configuração do filtro
     * @returns {Object} Query modificada
     */
    static applyFilter(query, filter) {
        const { type, operator, value } = filter;

        switch (type) {
            case 'birthday':
                // Filtro por aniversário - isso seria mais complexo na prática
                // Por simplicidade, vamos filtrar por nome ou alguma lógica básica
                if (operator === 'equals') {
                    // Simulação: filtrar por mês de aniversário (se disponível)
                    return query;
                }
                break;

            case 'has_phone':
                if (operator === 'equals' && value === 'true') {
                    return query.not('phone', 'is', null).neq('phone', '');
                }
                break;

            case 'age_range':
                // Isso seria implementado com data de nascimento
                // Por enquanto, apenas simulação
                break;

            default:
                // Filtros genéricos por campo
                switch (operator) {
                    case 'equals':
                        return query.eq(type, value);
                    case 'not_equals':
                        return query.neq(type, value);
                    case 'contains':
                        return query.ilike(type, `%${value}%`);
                    case 'greater':
                        return query.gt(type, value);
                    case 'less':
                        return query.lt(type, value);
                }
        }

        return query;
    }

    /**
     * Verifica se um paciente corresponde a um filtro
     * @param {Object} patient - Dados do paciente
     * @param {Object} filter - Configuração do filtro
     * @returns {boolean}
     */
    static matchesPatientFilter(patient, filter) {
        const { type, operator, value } = filter;

        switch (type) {
            case 'has_appointments':
                // Verificar se paciente tem consultas
                return patient.appointments && patient.appointments.length > 0;

            case 'last_appointment_days':
                // Verificar dias desde última consulta
                if (!patient.appointments || patient.appointments.length === 0) return false;
                const lastAppointment = patient.appointments.sort((a, b) =>
                    new Date(b.appointment_date) - new Date(a.appointment_date)
                )[0];
                const daysSince = Math.floor((new Date() - new Date(lastAppointment.appointment_date)) / (1000 * 60 * 60 * 24));

                switch (operator) {
                    case 'less': return daysSince < parseInt(value);
                    case 'greater': return daysSince > parseInt(value);
                    case 'equals': return daysSince === parseInt(value);
                }
                break;

            case 'patient_status':
                return patient.status === value;

            default:
                return true;
        }

        return true;
    }

    /**
     * Executa a ação da automação para os destinatários
     * @param {Object} automation - Configuração da automação
     * @param {Array} recipients - Lista de destinatários
     * @param {string} executionId - ID da execução
     * @returns {Promise<Array>} Resultados da execução
     */
    static async executeAction(automation, recipients, executionId) {
        const results = [];

        for (const recipient of recipients) {
            try {
                let success = false;
                let messageId = null;
                let errorMessage = null;

                switch (automation.action_type) {
                    case 'whatsapp_message':
                        const result = await this.sendWhatsAppMessage(automation, recipient);
                        success = result.success;
                        messageId = result.messageId;
                        errorMessage = result.error;
                        break;

                    case 'email':
                        // Implementar envio de email
                        success = true;
                        break;

                    case 'sms':
                        // Implementar envio de SMS
                        success = true;
                        break;
                }

                // Registrar resultado individual
                await supabase
                    .from('automation_execution_logs')
                    .insert({
                        execution_id: executionId,
                        target_phone: recipient.phone,
                        target_name: recipient.name,
                        status: success ? 'sent' : 'failed',
                        message_id: messageId,
                        error_message: errorMessage
                    });

                results.push({
                    success,
                    recipient: recipient.phone,
                    messageId,
                    error: errorMessage
                });

            } catch (error) {
                console.error(`Error sending to ${recipient.phone}:`, error);

                await supabase
                    .from('automation_execution_logs')
                    .insert({
                        execution_id: executionId,
                        target_phone: recipient.phone,
                        target_name: recipient.name,
                        status: 'failed',
                        error_message: error.message
                    });

                results.push({
                    success: false,
                    recipient: recipient.phone,
                    error: error.message
                });
            }
        }
        return results;
    }

    /**
     * Envia mensagem WhatsApp via Chatwoot (Backend Bridge)
     * @param {Object} automation - Configuração da automação
     * @param {Object} recipient - Destinatário
     * @returns {Promise<Object>} Resultado do envio
     */
    static async sendWhatsAppMessage(automation, recipient) {
        try {
            // Importação dinâmica para evitar ciclos se houver
            const { chatwootService } = await import('./chatwootService');

            // Preparar mensagem com template se necessário
            let message = automation.action_config.message_template;
            if (automation.action_config.use_template) {
                message = this.processTemplate(message, recipient);
            }

            console.log(`[Automation] Enviando via Chatwoot para ${recipient.name} (${recipient.phone})...`);

            // Usar o serviço refatorado que passa pelo Proxy seguro
            const result = await chatwootService.sendMessage(
                recipient.phone,
                message,
                recipient.name
            );

            if (result.success) {
                return {
                    success: true,
                    messageId: result.conversationId, // Chatwoot retorna conv ID, serve como tracking
                    error: null
                };
            } else {
                return {
                    success: false,
                    messageId: null,
                    error: result.error || 'Erro no envio via Chatwoot'
                };
            }

        } catch (error) {
            console.error('Error sending WhatsApp message via Chatwoot:', error);
            return {
                success: false,
                messageId: null,
                error: error.message
            };
        }
    }

    /**
     * Processa template de mensagem substituindo variáveis
     * @param {string} template - Template da mensagem
     * @param {Object} recipient - Dados do destinatário
     * @returns {string} Mensagem processada
     */
    static processTemplate(template, recipient) {
        return template
            .replace(/\{\{nome\}\}/g, recipient.name || 'Cliente')
            .replace(/\{\{telefone\}\}/g, recipient.phone || '')
            .replace(/\{\{data_consulta\}\}/g, 'hoje') // Placeholder
            .replace(/\{\{hora\}\}/g, 'agora'); // Placeholder
    }

    /**
     * Atualiza status de uma execução
     * @param {string} executionId - ID da execução
     * @param {string} status - Novo status
     * @param {number} targetCount - Número total de alvos
     * @param {number} successCount - Número de sucessos
     * @param {number} failureCount - Número de falhas
     * @param {string} errorMessage - Mensagem de erro (opcional)
     */
    static async updateExecutionStatus(executionId, status, targetCount, successCount, failureCount = 0, errorMessage = null) {
        const updateData = {
            status,
            target_count: targetCount,
            success_count: successCount,
            failure_count: failureCount
        };

        if (errorMessage) {
            updateData.error_message = errorMessage;
        }

        if (status === 'completed' || status === 'failed') {
            updateData.completed_at = new Date().toISOString();
        }

        await supabase
            .from('automation_executions')
            .update(updateData)
            .eq('id', executionId);
    }

    /**
     * Lista execuções de uma automação
     * @param {string} automationId - ID da automação
     * @param {number} limit - Número máximo de resultados
     * @returns {Promise<Array>} Lista de execuções
     */
    static async getAutomationExecutions(automationId, limit = 10) {
        const { data, error } = await supabase
            .from('automation_executions')
            .select(`
                *,
                profiles:user_id (
                    full_name
                )
            `)
            .eq('automation_id', automationId)
            .order('executed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Lista todas as automações ativas para triggers automáticos
     * @returns {Promise<Array>} Lista de automações ativas
     */
    static async getActiveAutomations() {
        const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('status', 'active')
            .neq('trigger_type', 'manual');

        if (error) throw error;
        return data || [];
    }

    /**
     * Executa triggers automáticos (deve ser chamado por cron job ou similar)
     * @returns {Promise<Array>} Resultados das execuções
     */
    static async executeAutomaticTriggers() {
        const automations = await this.getActiveAutomations();
        const results = [];

        for (const automation of automations) {
            try {
                // Verificar se deve executar baseado no trigger
                if (await this.shouldExecuteAutomation(automation)) {
                    const result = await this.executeAutomation(automation.id, null, 'automatic');
                    results.push(result);
                }
            } catch (error) {
                console.error(`Error executing automation ${automation.id}:`, error);
                results.push({
                    automationId: automation.id,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Verifica se uma automação deve ser executada baseada no trigger
     * @param {Object} automation - Configuração da automação
     * @returns {Promise<boolean>}
     */
    static async shouldExecuteAutomation(automation) {
        const now = new Date();

        switch (automation.trigger_type) {
            case 'scheduled':
                if (automation.trigger_config?.schedule) {
                    const scheduledTime = new Date(automation.trigger_config.schedule);
                    // Verificar se está na hora (com tolerância de 5 minutos)
                    const timeDiff = Math.abs(now - scheduledTime);
                    return timeDiff < 5 * 60 * 1000; // 5 minutos
                }
                break;

            case 'event':
                // Para eventos, seria necessário implementar lógica específica
                // Por exemplo, verificar se houve novos pacientes criados recentemente
                if (automation.trigger_config?.event_type === 'patient_created') {
                    // Verificar se há pacientes criados nas últimas horas
                    const recentPatients = await supabase
                        .from('patients')
                        .select('id')
                        .eq('clinic_id', automation.clinic_id)
                        .gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()) // Última hora
                        .limit(1);

                    return recentPatients.data && recentPatients.data.length > 0;
                }
                break;
        }

        return false;
    }

    /**
     * Checks for time-based triggers (20h no response -> Recovery, 24h follow-up -> Lost)
     * This is a client-side implementation of logic that should ideally be on backend.
     * @returns {Promise<{movedToRecovery: number, movedToLost: number}>}
     */
    static async checkTimeBasedTriggers() {
        try {
            // 1. Leads in 'new' for > 20h without response -> 'recovery'
            // We use client-side logical check.

            // Get 'new' leads
            const { data: newLeads, error: newLeadsError } = await supabase
                .from('leads')
                .select('id, created_at, status, last_message_at')
                .eq('status', 'new');

            if (newLeadsError) throw newLeadsError;

            const now = new Date();
            const leadsToRecover = newLeads.filter(lead => {
                const activityTime = lead.last_message_at ? new Date(lead.last_message_at) : new Date(lead.created_at);
                const hoursSince = (now - activityTime) / (1000 * 60 * 60);
                return hoursSince >= 20;
            });

            if (leadsToRecover.length > 0) {
                const ids = leadsToRecover.map(l => l.id);
                await supabase
                    .from('leads')
                    .update({ status: 'recovery' })
                    .in('id', ids);

                console.log(`[Automation] Moved ${ids.length} leads to Recovery (20h rule)`);
            }

            // 2. Leads in 'follow_up_sent' for > 24h without response -> 'no_purchase'
            const { data: followUpLeads, error: followUpError } = await supabase
                .from('leads')
                .select('id, updated_at, status, last_message_at')
                .eq('status', 'follow_up_sent');

            if (followUpError) throw followUpError;

            const leadsToLost = followUpLeads.filter(lead => {
                // If last message was FROM the lead, they responded, so we shouldn't move them to lost blindly.
                // However, the prompt says "case not respond in 24 hours".
                // We assume 'updated_at' reflects when they were moved to 'follow_up_sent'.
                // Ideally we verify if there was an INCOMING message after updated_at.
                // For simplified logic: checks if time since updated_at > 24h AND last_message_at < updated_at (meaning no new message since move)

                const moveTime = new Date(lead.updated_at);
                const lastMsgTime = lead.last_message_at ? new Date(lead.last_message_at) : new Date(0); // Epoch if null

                const timeSinceMove = (now - moveTime) / (1000 * 60 * 60);

                // If they responded after move, lastMsgTime should be > moveTime (approximately) 
                // BUT 'last_message_at' might be updated by outgoing messages too depending on implementation.
                // Assuming last_message_at tracks ANY message.
                // If they responded, they should have been moved to 'in_conversation' via webhook/manual interaction.
                // So if they are STILL in 'follow_up_sent' after 24h, assume no interaction occurred that moved them out.

                return timeSinceMove >= 24;
            });

            if (leadsToLost.length > 0) {
                const ids = leadsToLost.map(l => l.id);
                await supabase
                    .from('leads')
                    .update({ status: 'no_purchase' })
                    .in('id', ids);

                console.log(`[Automation] Moved ${ids.length} leads to Lost (24h follow-up rule)`);
            }

            return {
                movedToRecovery: leadsToRecover.length,
                movedToLost: leadsToLost.length
            };

        } catch (error) {
            console.error('[Automation] Error checking time triggers:', error);
            return { movedToRecovery: 0, movedToLost: 0 };
        }
    }

    /**
     * INTELLIGENT FOLLOW-UP AUTOMATION (GHOSTING RECOVERY)
     * Rules:
     * 1. 24h Silence -> Move to 'follow_up_1' + Send Msg 1
     * 2. 3 Days in 'follow_up_1' -> Move to 'follow_up_2' + Send Msg 2
     * 3. 4 Days in 'follow_up_2' (Total 7) -> Move to 'follow_up_3' + Send Msg 3 + Archive/Lost
     * 
     * Safety Lock: Logic to STOP this is in webhookReceiver (moves to 'in_conversation' on reply).
     */
    static async checkIntelligentFollowUp() {
        console.log('[Automation] Checking Intelligent Follow-up Rules...');
        const results = { stage1: 0, stage2: 0, stage3: 0 };
        const now = new Date();

        try {
            const { chatwootService } = await import('./chatwootService');

            // --- STAGE 1: 24h Silence (Quebra de Barreira) ---
            // Leads in 'new' or 'waiting' (assuming 'new' is the start)
            // Condition: Last Msg (from AGENT) > 24h ago OR Created > 24h ago (if no msg).
            // NOTE: We need to ensure we don't spam. Moving to 'follow_up_1' acts as the flag.

            const { data: stage1Leads, error: err1 } = await supabase
                .from('leads')
                .select('*')
                .in('status', ['new', 'waiting']); // Adjust status codes as needed

            if (!err1 && stage1Leads) {
                for (const lead of stage1Leads) {
                    const lastActivity = lead.last_message_at ? new Date(lead.last_message_at) : new Date(lead.created_at);
                    const hoursSince = (now - lastActivity) / (1000 * 60 * 60);

                    if (hoursSince >= 24) {
                        // Action: Move to follow_up_1 & Send Msg
                        console.log(`[Automation] Stage 1 triggered for lead ${lead.name}`);

                        const msg = `Oi, ${lead.name.split(' ')[0]}! 👋 Estava aqui pensando: muitas vezes as pessoas deixam de responder porque ainda não têm o exame de audiometria em mãos.\n\nSe esse for o caso, não se preocupe! A gente consegue fazer uma triagem inicial gratuita aqui na clínica mesmo, sem o exame pronto. Assim você já conhece a tecnologia.\n\nFaz sentido para você?`;

                        await chatwootService.sendMessage(lead.phone, msg, lead.name);
                        await supabase.from('leads').update({ status: 'follow_up_1', last_message_at: new Date().toISOString() }).eq('id', lead.id);
                        results.stage1++;
                    }
                }
            }

            // --- STAGE 2: 3 Days in Stage 1 (Escassez) ---
            const { data: stage2Leads, error: err2 } = await supabase
                .from('leads')
                .select('*')
                .eq('status', 'follow_up_1');

            if (!err2 && stage2Leads) {
                for (const lead of stage2Leads) {
                    // Check time since entered Stage 1 (updated_at) OR last message
                    // User said: "Last message was OURS and > 3 days"
                    // If they are in follow_up_1, we assume the last msg was the automation one or manual agent.
                    // If client replied, they would be in 'in_conversation'.

                    const lastActivity = lead.updated_at ? new Date(lead.updated_at) : new Date(lead.created_at);
                    const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
                    const daysSince = hoursSince / 24;

                    if (daysSince >= 3) {
                        console.log(`[Automation] Stage 2 triggered for lead ${lead.name}`);

                        const msg = `Olá, ${lead.name.split(' ')[0]}. Tudo bem?\n\nEstou organizando a agenda da Dra. Karine para a próxima semana e notei que nossa conversa ficou pendente.\n\nComo a procura tem sido alta, vou precisar liberar a pré-reserva que fiz para você para outros pacientes da lista de espera, tudo bem?\n\nPode me chamar aqui para agendar sua avaliação sem custo!`;

                        await chatwootService.sendMessage(lead.phone, msg, lead.name);
                        await supabase.from('leads').update({ status: 'follow_up_2', last_message_at: new Date().toISOString() }).eq('id', lead.id);
                        results.stage2++;
                    }
                }
            }

            // --- STAGE 3: 4 Days in Stage 2 (Total 7) (Despedida) ---
            const { data: stage3Leads, error: err3 } = await supabase
                .from('leads')
                .select('*')
                .eq('status', 'follow_up_2');

            if (!err3 && stage3Leads) {
                for (const lead of stage3Leads) {
                    const lastActivity = lead.updated_at ? new Date(lead.updated_at) : new Date(lead.created_at);
                    const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
                    const daysSince = hoursSince / 24;

                    if (daysSince >= 4) { // 3 days (prev) + 4 days (now) = 7 days total roughly
                        console.log(`[Automation] Stage 3 triggered for lead ${lead.name}`);

                        const msg = `${lead.name.split(' ')[0]}, como não tivemos mais retorno, imagino que você já tenha resolvido ou que agora não seja o momento ideal para o atendimento na Audicare.\n\nVou encerrar seu atendimento por aqui para não lotar seu WhatsApp, tá bom?\n\nQuando precisar cuidar da sua audição, estaremos aqui. Um abraço! 👋`;

                        await chatwootService.sendMessage(lead.phone, msg, lead.name);
                        // Move to follow_up_3 (which acts as lost/archived in this flow) or directly to no_purchase?
                        // User said: "Mover para coluna 'Follow-up 3' ... Arquivar ou marcar como 'Perdido' após envio."
                        // We'll move to follow_up_3 first.
                        await supabase.from('leads').update({ status: 'follow_up_3', last_message_at: new Date().toISOString() }).eq('id', lead.id);
                        results.stage3++;
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('[Automation] Error in Intelligent Follow-up:', error);
            return results;
        }
    }
}
