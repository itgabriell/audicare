const { supabase } = require('../lib/customSupabaseClient');
const chatwootBackendService = require('./ChatwootBackendService');
const cron = require('node-cron');

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
              const message = this.processTemplate(automation.action_config.message, { patient });

              const result = await chatwootBackendService.sendMessage(phoneNumber, message);

              // Registrar log
              await supabase
                .from('automation_execution_logs')
                .insert({
                  execution_id: executionId,
                  target_phone: phoneNumber,
                  target_name: patient.name,
                  status: result.success ? 'sent' : 'failed',
                  message_id: result.messageId,
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
          id, start_time, title, status,
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
            const message = this.processTemplate(automation.action_config.message, {
              patient,
              appointment
            });

            const result = await chatwootBackendService.sendMessage(phoneNumber, message);

            // Registrar log
            await supabase
              .from('automation_execution_logs')
              .insert({
                execution_id: executionId,
                target_phone: phoneNumber,
                target_name: patient.name,
                status: result.success ? 'sent' : 'failed',
                message_id: result.messageId,
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
          id, start_time, title, status,
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

          const message = this.processTemplate(automation.action_config.message, {
            patient,
            appointment
          });

          const result = await chatwootBackendService.sendMessage(phoneNumber, message);

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
              message_id: result.messageId,
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
    let message = template;

    // Substituir placeholders básicos
    if (data.patient) {
      message = message.replace(/\{\{nome\}\}/g, data.patient.name || 'Paciente');
    }

    if (data.appointment) {
      const appointmentDate = new Date(data.appointment.start_time);
      const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
      const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      message = message.replace(/\{\{data\}\}/g, formattedDate);
      message = message.replace(/\{\{hora\}\}/g, formattedTime);
    }

    return message;
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
   * Testa uma automação
   */
  async testAutomation(automationId, testPhone) {
    try {
      const { data: automation, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (error || !automation) {
        throw new Error('Automação não encontrada');
      }

      // Criar dados de teste
      const testData = {
        patient: { name: 'João Silva', phone: testPhone },
        appointment: {
          title: 'Consulta de Rotina',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const message = this.processTemplate(automation.action_config.message, testData);
      const result = await chatwootBackendService.sendMessage(testPhone, message);

      return {
        success: result.success,
        automationId,
        testPhone,
        message,
        messageId: result.messageId,
        error: result.error
      };

    } catch (error) {
      console.error('❌ Erro no teste:', error.message);
      return {
        success: false,
        automationId,
        testPhone,
        error: error.message
      };
    }
  }
}

module.exports = new AutomationManager();
