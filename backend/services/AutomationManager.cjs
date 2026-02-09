const { supabase } = require('../lib/customSupabaseClient.cjs');
const chatwootBackendService = require('./ChatwootBackendService.cjs');
const cron = require('node-cron');
const axios = require('axios');

/**
 * Gerenciador de Automações usando banco de dados
 * Sistema robusto para criação, edição e execução de automações
 */
class AutomationManager {
  constructor() {
    this.cronJobs = new Map(); // Mapa para armazenar jobs ativos
    this.initializeExistingAutomations();
  }

  /**
   * Inicializa automações existentes do banco
   */
  async initializeExistingAutomations() {
    try {
      console.log('🔄 [AutomationManager] Inicializando automações existentes...');

      const { data: automations, error } = await supabase
        .from('automations')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      for (const automation of automations || []) {
        await this.scheduleAutomation(automation);
      }

      console.log(`✅ [AutomationManager] ${automations?.length || 0} automações inicializadas`);
    } catch (error) {
      console.error('❌ [AutomationManager] Erro ao inicializar automações:', error.message);
    }
  }

  /**
   * Agenda uma automação no cron
   * @param {Object} automation - Dados da automação
   */
  async scheduleAutomation(automation) {
    try {
      // Cancelar job existente se houver
      if (this.cronJobs.has(automation.id)) {
        this.cronJobs.get(automation.id).destroy();
        this.cronJobs.delete(automation.id);
      }

      if (automation.trigger_type === 'scheduled' && automation.trigger_config?.schedule) {
        const job = cron.schedule(automation.trigger_config.schedule, async () => {
          console.log(`🚀 [AutomationManager] Executando automação: ${automation.name}`);
          await this.executeAutomation(automation.id);
        });

        this.cronJobs.set(automation.id, job);
        console.log(`✅ [AutomationManager] Automação agendada: ${automation.name} (${automation.trigger_config.schedule})`);
      }
    } catch (error) {
      console.error(`❌ [AutomationManager] Erro ao agendar automação ${automation.id}:`, error.message);
    }
  }

  /**
   * Executa uma automação
   * @param {string} automationId - ID da automação
   * @returns {Promise<Object>} - Resultado da execução
   */
  async executeAutomation(automationId) {
    try {
      // Buscar automação
      const { data: automation, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (error || !automation) {
        throw new Error(`Automação não encontrada: ${automationId}`);
      }

      // Criar registro de execução
      const { data: execution, error: execError } = await supabase
        .from('automation_executions')
        .insert({
          automation_id: automationId,
          status: 'running'
        })
        .select()
        .single();

      if (execError) throw execError;

      let successCount = 0;
      let failureCount = 0;
      const logs = [];

      try {
        // Executar baseado no tipo
        switch (automation.name) {
          case 'birthday':
            const birthdayResult = await this.executeBirthdayAutomation(automation, execution.id);
            successCount = birthdayResult.successCount;
            failureCount = birthdayResult.failureCount;
            logs.push(...birthdayResult.logs);
            break;

          case 'appointment_confirmation':
            const confirmationResult = await this.executeAppointmentConfirmation(automation, execution.id);
            successCount = confirmationResult.successCount;
            failureCount = confirmationResult.failureCount;
            logs.push(...confirmationResult.logs);
            break;

          case 'welcome_checkin':
          case 'goodbye_checkout':
            // Essas são executadas via triggers, não cron
            break;

          default:
            // Automação customizada
            const customResult = await this.executeCustomAutomation(automation, execution.id);
            successCount = customResult.successCount;
            failureCount = customResult.failureCount;
            logs.push(...customResult.logs);
        }

        // Atualizar execução como completa
        await supabase
          .from('automation_executions')
          .update({
            status: 'completed',
            success_count: successCount,
            failure_count: failureCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        console.log(`✅ [AutomationManager] Automação ${automation.name} concluída: ${successCount} sucesso(s), ${failureCount} falha(s)`);

        // CRIAR NOTIFICAÇÃO DE SISTEMA
        await this.createSystemNotification({
          title: 'Automação Finalizada',
          message: `Automação "${automation.name}" concluída. Enviados: ${successCount}, Falhas: ${failureCount}.`,
          type: 'system',
          metadata: {
            automation_id: automation.id,
            execution_id: execution.id,
            success_count: successCount,
            failure_count: failureCount
          }
        });

        return {
          success: true,
          automationId,
          successCount,
          failureCount,
          logs
        };

      } catch (execError) {
        // Marcar como falha
        await supabase
          .from('automation_executions')
          .update({
            status: 'failed',
            error_message: execError.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        await this.createSystemNotification({
          title: 'Erro na Automação',
          message: `Falha ao executar "${automation.name}": ${execError.message}`,
          type: 'error',
          metadata: { automation_id: automationId, error: execError.message }
        });

        throw execError;
      }

    } catch (error) {
      console.error(`❌ [AutomationManager] Erro na execução da automação ${automationId}:`, error.message);
      return {
        success: false,
        automationId,
        error: error.message
      };
    }
  }

  /**
   * Cria uma notificação no sistema (Tabela notifications)
   */
  async createSystemNotification({ title, message, type, metadata }) {
    try {
      // Tenta buscar um usuário admin ou o primeiro usuário para atribuir a notificação
      // Idealmente seria para todos os admins, mas vamos simplificar pegando um usuário válido
      // ou deixando user_id null se a tabela permitir (geralmente notifications requer user_id)

      // Estratégia: Inserir sem user_id se for notificação global, ou buscar um admin
      // Vamos tentar inserir com um user padrão ou buscar o dono da automação se possível.
      // Como aqui não tenho o user context, vou tentar buscar o primeiro user da tabela auth (via hack ou query se possível, mas auth é protegido).
      // Melhor: Buscar na tabela profiles um admin.

      const { data: admin } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin') // Assumindo coluna role
        .limit(1)
        .single();

      const targetUserId = admin?.id;

      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: type || 'info', // system, alert, info
          title,
          message,
          metadata: metadata || {},
          read: false
        });
      }
    } catch (error) {
      console.warn('⚠️ Falha ao criar notificação de sistema:', error.message);
    }
  }

  /**
   * Executa automação de aniversários
   */
  async executeBirthdayAutomation(automation, executionId) {
    const logs = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, name, phone, phones:patient_phones(phone, is_primary, is_whatsapp)')
        .not('phone', 'is', null)
        .neq('phone', '')
        .limit(100);

      if (error) throw error;

      for (const patient of patients || []) {
        try {
          // Lógica simplificada de aniversário (melhorar depois)
          const shouldSend = this.shouldSendBirthdayMessage(patient, todayStr);

          if (shouldSend) {
            const phoneNumber = this.getPrimaryPhoneNumber(patient);

            if (phoneNumber) {
              const message = this.processTemplate(automation.action_config.message_template || automation.action_config.message, { patient });

              // Usar envio via Chatwoot
              const result = await this.sendViaChatwoot(phoneNumber, message);

              // Registrar log
              await supabase
                .from('automation_execution_logs')
                .insert({
                  execution_id: executionId,
                  target_phone: phoneNumber,
                  target_name: patient.name,
                  status: result.success ? 'sent' : 'failed',
                  error_message: result.error
                });

              logs.push({
                patientId: patient.id,
                patientName: patient.name,
                phone: phoneNumber,
                success: result.success,
                error: result.error
              });

              if (result.success) successCount++;
              else failureCount++;
            }
          }
        } catch (error) {
          console.error(`❌ Paciente ${patient.id}:`, error.message);
          failureCount++;
        }
      }

    } catch (error) {
      console.error('❌ Erro na automação de aniversários:', error.message);
    }

    return { successCount, failureCount, logs };
  }

  /**
   * Executa automação de confirmação de consultas
   */
  async executeAppointmentConfirmation(automation, executionId) {
    const logs = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      const daysAhead = automation.trigger_config?.days_ahead || 2;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id, start_time, title, status, location,
            patients:patient_id (id, name, phone, phones:patient_phones(phone, is_primary, is_whatsapp))
          `)
        .eq('status', 'scheduled')
        .gte('start_time', `${targetDateStr}T00:00:00.000Z`)
        .lt('start_time', `${targetDateStr}T23:59:59.999Z`);

      if (error) throw error;

      for (const appointment of appointments || []) {
        try {
          const patient = appointment.patients;
          if (!patient) continue;

          const phoneNumber = this.getPrimaryPhoneNumber(patient);

          if (phoneNumber) {
            let messageTemplate = automation.action_config.message_template || automation.action_config.message;

            // [CUSTOM] Mensagem específica para domiciliar
            if (appointment.location && appointment.location.toLowerCase() === 'domiciliar') {
              messageTemplate = "Olá {{nome}}, seu agendamento domiciliar foi realizado com sucesso para dia {{data}} às {{hora}}.\n\nPor gentileza, nos envie o endereço e a localização.\n\nQualquer dúvida, pode nos chamar! 🦻";
            }

            const message = this.processTemplate(messageTemplate, {
              patient,
              appointment
            });

            // Usar envio via Chatwoot
            const result = await this.sendViaChatwoot(phoneNumber, message);

            // Registrar log (adaptado)
            await supabase
              .from('automation_execution_logs')
              .insert({
                execution_id: executionId,
                target_phone: phoneNumber,
                target_name: patient.name,
                status: result.success ? 'sent' : 'failed',
                error_message: result.error
              });

            logs.push({
              appointmentId: appointment.id,
              patientId: patient.id,
              patientName: patient.name,
              phone: phoneNumber,
              success: result.success,
              error: result.error
            });

            if (result.success) successCount++;
            else failureCount++;
          }
        } catch (error) {
          console.error(`❌ Consulta ${appointment.id}:`, error.message);
          failureCount++;
        }
      }

    } catch (error) {
      console.error('❌ Erro na automação de confirmações:', error.message);
    }

    return { successCount, failureCount, logs };
  }

  /**
   * Executa automação customizada
   */
  async executeCustomAutomation(automation, executionId) {
    // Implementar lógica para automações customizadas
    // Por enquanto, apenas retorna vazio
    return { successCount: 0, failureCount: 0, logs: [] };
  }

  /**
   * Processa mudança de status do agendamento e dispara automações
   */
  async processAppointmentStatusChange(appointmentId, newStatus, oldStatus) {
    try {
      console.log(`🔄 [AutomationManager] Processando mudança: ${oldStatus} → ${newStatus}`);

      // Buscar automações do tipo 'event' que respondem a mudanças de status
      const { data: automations, error } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'event')
        .eq('status', 'active');

      if (error) throw error;

      // Filtrar automações relevantes para este status
      const relevantAutomations = automations?.filter(auto =>
        auto.trigger_config?.appointment_status === newStatus
      ) || [];

      if (relevantAutomations.length === 0) {
        return { success: true, reason: 'no_relevant_automations' };
      }

      // Buscar dados do agendamento
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
            id, start_time, title, status, location,
            patients:patient_id (id, name, phone, phones:patient_phones(phone, is_primary, is_whatsapp))
          `)
        .eq('id', appointmentId)
        .single();

      if (aptError || !appointment) {
        throw new Error('Agendamento não encontrado');
      }

      const patient = appointment.patients;
      if (!patient) {
        throw new Error('Paciente não encontrado');
      }

      const phoneNumber = this.getPrimaryPhoneNumber(patient);
      if (!phoneNumber) {
        return { success: false, reason: 'no_phone' };
      }

      // Executar cada automação relevante
      const results = [];
      for (const automation of relevantAutomations) {
        try {
          // Criar execução
          const { data: execution } = await supabase
            .from('automation_executions')
            .insert({
              automation_id: automation.id,
              execution_type: 'automatic',
              status: 'running'
            })
            .select()
            .single();

          let messageTemplate = automation.action_config.message_template || automation.action_config.message;

          // [CUSTOM] Mensagem específica para domiciliar
          if (appointment.location && appointment.location.toLowerCase() === 'domiciliar') {
            messageTemplate = "Olá {{nome}}, seu agendamento domiciliar foi realizado com sucesso para dia {{data}} às {{hora}}.\n\nPor gentileza, nos envie o endereço e a localização.\n\nQualquer dúvida, pode nos chamar! 🦻";
          }

          const message = this.processTemplate(messageTemplate, {
            patient,
            appointment
          });

          // Usar envio via Chatwoot
          const result = await this.sendViaChatwoot(phoneNumber, message);

          // Atualizar execução
          await supabase
            .from('automation_executions')
            .update({
              status: result.success ? 'completed' : 'failed',
              success_count: result.success ? 1 : 0,
              failure_count: result.success ? 0 : 1,
              completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);

          // Registrar log
          await supabase
            .from('automation_execution_logs')
            .insert({
              execution_id: execution.id,
              target_phone: phoneNumber,
              target_name: patient.name,
              status: result.success ? 'sent' : 'failed',
              error_message: result.error
            });

          results.push({
            automationId: automation.id,
            automationName: automation.name,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });

        } catch (error) {
          console.error(`❌ Automação ${automation.id}:`, error.message);
          results.push({
            automationId: automation.id,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        appointmentId,
        newStatus,
        oldStatus,
        automationsTriggered: results.length,
        results
      };

    } catch (error) {
      console.error('❌ Erro no processamento de status:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processa template de mensagem
   */
  processTemplate(template, data) {
    console.log('[AutomationManager] Processando template:', { template, data });

    // Verificar se template existe
    if (!template || typeof template !== 'string') {
      console.error('[AutomationManager] Template inválido ou ausente:', {
        template,
        type: typeof template,
        data
      });
      return 'Mensagem de teste - Template não configurado';
    }

    let message = template;

    try {
      // Substituir placeholders básicos
      if (data.patient) {
        message = message.replace(/\{\{nome\}\}/g, data.patient.name || 'Paciente');
      }

      if (data.appointment) {
        const appointmentDate = new Date(data.appointment.start_time);
        const formattedDate = appointmentDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });

        message = message.replace(/\{\{data\}\}/g, formattedDate);
        message = message.replace(/\{\{hora\}\}/g, formattedTime);
      }

      console.log('[AutomationManager] Template processado com sucesso:', message);
      return message;
    } catch (error) {
      console.error('[AutomationManager] Erro no processamento do template:', {
        error: error.message,
        template,
        data
      });
      return 'Mensagem de teste - Erro no processamento do template';
    }
  }

  /**
   * Verifica se deve enviar mensagem de aniversário
   */
  shouldSendBirthdayMessage(patient, todayStr) {
    // Lógica simplificada - melhorar depois
    if (patient.created_at) {
      const createdDate = new Date(patient.created_at);
      const createdMonthDay = `${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
      return createdMonthDay === todayStr;
    }
    return false;
  }

  /**
   * Obtém número de telefone principal
   */
  getPrimaryPhoneNumber(patient) {
    if (patient.phones && patient.phones.length > 0) {
      const primaryPhone = patient.phones.find(p => p.is_primary && p.is_whatsapp);
      if (primaryPhone) return primaryPhone.phone;

      const whatsappPhone = patient.phones.find(p => p.is_whatsapp);
      if (whatsappPhone) return whatsappPhone.phone;

      return patient.phones[0].phone;
    }

    return patient.phone;
  }

  /**
   * Cria ou atualiza uma automação
   */
  async saveAutomation(automationData) {
    try {
      const automation = {
        clinic_id: automationData.clinicId,
        name: automationData.name,
        description: automationData.description,
        trigger_type: automationData.triggerType,
        trigger_config: automationData.triggerConfig,
        action_type: automationData.actionType,
        action_config: automationData.actionConfig,
        filter_config: automationData.filterConfig || {},
        status: automationData.status || 'active',
        created_by: automationData.createdBy
      };

      const { data, error } = await supabase
        .from('automations')
        .upsert(automation)
        .select()
        .single();

      if (error) throw error;

      // Re-agendar se necessário
      if (data.status === 'active') {
        await this.scheduleAutomation(data);
      } else {
        // Remover do cron se estiver pausada
        if (this.cronJobs.has(data.id)) {
          this.cronJobs.get(data.id).destroy();
          this.cronJobs.delete(data.id);
        }
      }

      return { success: true, automation: data };

    } catch (error) {
      console.error('❌ Erro ao salvar automação:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista automações da clínica
   */
  async getAutomations(clinicId) {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, automations: data || [] };

    } catch (error) {
      console.error('❌ Erro ao buscar automações:', error.message);
      return { success: false, automations: [], error: error.message };
    }
  }

  /**
   * Busca uma automação por ID
   */
  async getAutomation(automationId) {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (error) throw error;

      return { success: true, automation: data };

    } catch (error) {
      console.error('❌ Erro ao buscar automação:', error.message);
      return { success: false, automation: null, error: error.message };
    }
  }

  /**
   * Atualiza uma automação existente
   */
  async updateAutomation(automationId, automationData) {
    try {
      const updateData = {
        name: automationData.name,
        description: automationData.description,
        trigger_type: automationData.triggerType,
        trigger_config: automationData.triggerConfig,
        action_type: automationData.actionType,
        action_config: automationData.actionConfig,
        filter_config: automationData.filterConfig || {},
        status: automationData.status,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('automations')
        .update(updateData)
        .eq('id', automationId)
        .select()
        .single();

      if (error) throw error;

      // Re-agendar se necessário
      if (data.status === 'active') {
        await this.scheduleAutomation(data);
      } else {
        // Remover do cron se estiver pausada
        if (this.cronJobs.has(data.id)) {
          this.cronJobs.get(data.id).destroy();
          this.cronJobs.delete(data.id);
        }
      }

      return { success: true, automation: data };

    } catch (error) {
      console.error('❌ Erro ao atualizar automação:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove uma automação
   */
  async deleteAutomation(automationId) {
    try {
      // Remover do cron
      if (this.cronJobs.has(automationId)) {
        this.cronJobs.get(automationId).destroy();
        this.cronJobs.delete(automationId);
      }

      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId);

      if (error) throw error;

      return { success: true };

    } catch (error) {
      console.error('❌ Erro ao remover automação:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia mensagem via Chatwoot (Substituindo UAZAPI)
   */
  async sendViaChatwoot(phone, message) {
    try {
      console.log(`[AutomationManager] Enviando via Chatwoot para ${phone}`);

      const CHATWOOT_BASE_URL = process.env.VITE_CHATWOOT_BASE_URL || process.env.CHATWOOT_BASE_URL || 'https://chat.audicarefono.com.br';
      const ACCOUNT_ID = process.env.VITE_CHATWOOT_ACCOUNT_ID || process.env.CHATWOOT_ACCOUNT_ID || '2';
      const API_TOKEN = process.env.VITE_CHATWOOT_API_TOKEN || process.env.CHATWOOT_API_TOKEN;
      const INBOX_ID = process.env.VITE_CHATWOOT_INBOX_ID || '1'; // Default Inbox 1

      if (!API_TOKEN) throw new Error('CHATWOOT_API_TOKEN não configurado');

      // 1. Limpar telefone
      let cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone.startsWith('55') && cleanPhone.length > 9) cleanPhone = `55${cleanPhone}`;

      const headers = {
        'Content-Type': 'application/json',
        'api_access_token': API_TOKEN
      };

      // 2. Buscar Contato
      let contactId;
      const searchUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${cleanPhone}`;
      const searchRes = await axios.get(searchUrl, { headers });

      if (searchRes.data.payload && searchRes.data.payload.length > 0) {
        contactId = searchRes.data.payload[0].id;
      } else {
        // Criar contato se não existir
        const createUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`;
        const createRes = await axios.post(createUrl, {
          name: 'Paciente (Via Automação)',
          phone_number: `+${cleanPhone}`
        }, { headers });
        contactId = createRes.data.payload.contact.id;
      }

      // 3. Criar Conversa
      const convUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`;
      // Tentar encontrar conversa existente aberta primeiro? O Chatwoot cria nova se não passar ID?
      // Vamos criar nova para garantir o envio
      const convRes = await axios.post(convUrl, {
        source_id: contactId,
        inbox_id: INBOX_ID,
        contact_id: contactId,
        status: 'open'
      }, { headers });

      const conversationId = convRes.data.id;

      // 4. Enviar Mensagem
      const msgUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;
      const msgRes = await axios.post(msgUrl, {
        content: message,
        message_type: 'outgoing',
        private: false
      }, { headers });

      return { success: true, messageId: msgRes.data.id };

    } catch (error) {
      console.error('❌ [AutomationManager] Erro envio Chatwoot:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa NOVO AGENDAMENTO (Trigger: appointment_created)
   */
  async processAppointmentCreated(appointmentId) {
    try {
      console.log(`🚀 [AutomationManager] INICIANDO TRIGGER: appointment_created para ID ${appointmentId}`);

      // 1. Buscar automações ativas para este evento
      const { data: automations, error } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'event')
        .eq('status', 'active');

      if (error) {
        console.error('❌ [AutomationManager] Erro ao buscar automações:', error.message);
        throw error;
      }

      console.log(`📋 [AutomationManager] Automações ativas encontradas: ${automations?.length || 0}`);

      // Filtrar no código pois o campo é JSONB ou texto variado
      const relevantAutomations = automations?.filter(auto => {
        const isMatch = auto.trigger_config?.event_type === 'appointment_created';
        console.log(`   - Automação "${auto.name}": Match? ${isMatch}`);
        return isMatch;
      }) || [];

      console.log(`🎯 [AutomationManager] Automações RELEVANTES para este evento: ${relevantAutomations.length}`);

      if (relevantAutomations.length === 0) {
        console.warn('⚠️ [AutomationManager] Nenhuma automação configurada para appointment_created. Saindo.');
        return { success: true, reason: 'no_automations' };
      }

      // 2. Buscar dados completos do agendamento
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
                id, start_time, title, status,
                patients:patient_id (id, name, phone, phones:patient_phones(phone, is_primary, is_whatsapp))
            `)
        .eq('id', appointmentId)
        .single();

      if (aptError || !appointment) {
        console.error('❌ [AutomationManager] Agendamento não encontrado no banco.');
        throw new Error('Agendamento não encontrado');
      }

      const patient = appointment.patients;
      if (!patient) {
        console.error('❌ [AutomationManager] Paciente não encontrado para este agendamento.');
        throw new Error('Paciente não encontrado');
      }

      console.log(`👤 [AutomationManager] Paciente: ${patient.name} (ID: ${patient.id})`);

      const phoneNumber = this.getPrimaryPhoneNumber(patient);
      console.log(`📱 [AutomationManager] Telefone identificado: ${phoneNumber}`);

      if (!phoneNumber) {
        console.warn('⚠️ [AutomationManager] Paciente sem telefone válido. Abortando.');
        return { success: false, reason: 'no_phone' };
      }

      // 3. Executar automações
      for (const automation of relevantAutomations) {
        console.log(`▶️ [AutomationManager] Executando automação: ${automation.name}`);

        const message = this.processTemplate(automation.action_config.message_template, { patient, appointment });
        console.log(`📝 [AutomationManager] Mensagem gerada: "${message}"`);

        const result = await this.sendViaChatwoot(phoneNumber, message);
        console.log(`📨 [AutomationManager] Resultado envio:`, result);

        // Logar execução (simplificado)
        if (result.success) {
          await supabase.from('automation_execution_logs').insert({
            target_phone: phoneNumber,
            target_name: patient.name,
            status: 'sent',
            // message_content: message, // Se tiver coluna
            automation_id: automation.id
          });
        }
      }

      return { success: true, triggered: relevantAutomations.length };

    } catch (error) {
      console.error('❌ [AutomationManager] ERRO FATAL processAppointmentCreated:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Testa uma automação
   */
  async testAutomation(automationId, testPhone) {
    try {
      console.log(`🧪 [AutomationManager] Testando automação ${automationId}`);

      const { data: automation, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (error || !automation) throw new Error('Automação não encontrada');

      // Dados Mock
      const testData = {
        patient: { name: 'Paciente Teste', phone: testPhone },
        appointment: {
          title: 'Consulta Teste',
          start_time: new Date(Date.now() + 86400000).toISOString() // Amanhã
        }
      };

      const message = this.processTemplate(automation.action_config.message_template || automation.action_config.message, testData);

      // Enviar via Chatwoot
      const result = await this.sendViaChatwoot(testPhone, message);

      return {
        success: result.success,
        automationId,
        message,
        error: result.error
      };

    } catch (error) {
      console.error('❌ [AutomationManager] Erro no teste:', error.message);
      return { success: false, error: error.message };
    }
  }


  /**
   * Aplica filtro específico para obter telefones
   * @param {Object} filter - Configuração do filtro
   * @param {string} clinicId - ID da clínica
   * @returns {Promise<Array>} - Telefones que correspondem ao filtro
   */
  async applyFilterToPhones(filter, clinicId) {
    const { type, operator, value } = filter;
    const phones = [];

    try {
      switch (type) {
        case 'has_phone':
          if (operator === 'equals' && value === 'true') {
            // Buscar contatos com telefone
            const { data: contacts, error } = await supabase
              .from('contacts')
              .select('phone')
              .eq('clinic_id', clinicId)
              .not('phone', 'is', null)
              .neq('phone', '')
              .limit(10);

            if (!error && contacts) {
              contacts.forEach(contact => {
                if (contact.phone) phones.push(contact.phone);
              });
            }
          }
          break;

        case 'birthday':
          // Para teste, buscar qualquer contato com telefone
          const { data: birthdayContacts, error: birthdayError } = await supabase
            .from('contacts')
            .select('phone')
            .eq('clinic_id', clinicId)
            .not('phone', 'is', null)
            .neq('phone', '')
            .limit(5);

          if (!birthdayError && birthdayContacts) {
            birthdayContacts.forEach(contact => {
              if (contact.phone) phones.push(contact.phone);
            });
          }
          break;

        case 'has_appointments':
          // Buscar pacientes com consultas
          const { data: patientsWithAppointments, error: aptError } = await supabase
            .from('patients')
            .select('phone')
            .eq('clinic_id', clinicId)
            .not('phone', 'is', null)
            .neq('phone', '')
            .limit(5);

          if (!aptError && patientsWithAppointments) {
            patientsWithAppointments.forEach(patient => {
              if (patient.phone) phones.push(patient.phone);
            });
          }
          break;

        case 'patient_status':
          // Buscar pacientes com status específico
          const { data: patientsByStatus, error: statusError } = await supabase
            .from('patients')
            .select('phone')
            .eq('clinic_id', clinicId)
            .eq('status', value)
            .not('phone', 'is', null)
            .neq('phone', '')
            .limit(5);

          if (!statusError && patientsByStatus) {
            patientsByStatus.forEach(patient => {
              if (patient.phone) phones.push(patient.phone);
            });
          }
          break;

        default:
          // Filtro genérico - buscar contatos
          const { data: genericContacts, error: genericError } = await supabase
            .from('contacts')
            .select('phone')
            .eq('clinic_id', clinicId)
            .not('phone', 'is', null)
            .neq('phone', '')
            .limit(5);

          if (!genericError && genericContacts) {
            genericContacts.forEach(contact => {
              if (contact.phone) phones.push(contact.phone);
            });
          }
      }

    } catch (error) {
      console.error(`❌ [AutomationManager] Erro ao aplicar filtro ${type}:`, error.message);
    }

    return phones;
  }

  /**
   * Envia mensagem diretamente para UAZAPI (bypass Chatwoot)
   * @param {string} phoneNumber - Número do telefone
   * @param {string} message - Conteúdo da mensagem
   * @returns {Promise<Object>} - Resultado do envio
   */
  async sendDirectToUAZAPI(phoneNumber, message) {
    try {
      console.log(`📱 [UAZAPI] Enviando mensagem diretamente para ${phoneNumber}`);

      // Formatar telefone para formato brasileiro (sem +)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 11 ? cleanPhone : cleanPhone;

      console.log(`📞 [UAZAPI] Telefone formatado: ${formattedPhone}`);

      // Criar payload da mensagem
      const payload = {
        chatid: `${formattedPhone}@s.whatsapp.net`,
        content: {
          text: message,
          contextInfo: {}
        },
        convertOptions: "",
        edited: "",
        fromMe: true,
        messageTimestamp: Date.now(),
        messageType: "ExtendedTextMessage",
        owner: "55123456789", // Número do bot
        quoted: "",
        reaction: "",
        readChatAttempted: false,
        sender: "55123456789@s.whatsapp.net",
        senderName: "Audicare Aparelhos Auditivos",
        source: "api",
        status: "Pending",
        text: message,
        track_id: "",
        track_source: ""
      };

      console.log(`📤 [UAZAPI] Payload:`, JSON.stringify(payload, null, 2));

      // Endpoint correto da UAZAPI para texto
      const uazapiUrl = 'https://audicare.uazapi.com/send/text';
      console.log(`🔄 [UAZAPI] Usando endpoint correto: ${uazapiUrl}`);

      // Payload limpo conforme esperado pela UAZAPI
      const cleanPayload = {
        number: formattedPhone,  // Apenas números: "556185155358"
        text: message           // Apenas o texto da mensagem
      };

      console.log('🚀 [UAZAPI] Enviando Clean Payload para /send/text:', JSON.stringify(cleanPayload));

      const apiResponse = await axios.post(uazapiUrl, cleanPayload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': 'c1bd63dc-e1c4-4956-bd0b-e277bb59dc38'  // Token de autenticação
        }
      });

      console.log(`✅ [UAZAPI] Resposta:`, apiResponse.data);

      // Verificar se foi enviado com sucesso
      if (apiResponse.data && !apiResponse.data.code) {
        console.log(`🎯 [UAZAPI] Mensagem enviada com sucesso`);

        return {
          success: true,
          messageId: `uazapi_${Date.now()}`,
          directSend: true
        };
      } else {
        console.warn(`⚠️ [UAZAPI] Resposta com código:`, apiResponse.data);
        return {
          success: false,
          error: apiResponse.data?.message || 'Erro na UAZAPI',
          directSend: true
        };
      }

    } catch (error) {
      console.error('❌ [UAZAPI] Erro ao enviar diretamente:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      return {
        success: false,
        error: error.message,
        directSend: true
      };
    }
  }
}

module.exports = new AutomationManager();
