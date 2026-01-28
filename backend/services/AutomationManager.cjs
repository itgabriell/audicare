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
              const message = this.processTemplate(automation.action_config.message_template || automation.action_config.message, { patient });

              // Usar envio direto para UAZAPI (não Chatwoot)
              const result = await this.sendDirectToUAZAPI(phoneNumber, message);

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
            const message = this.processTemplate(automation.action_config.message_template || automation.action_config.message, {
              patient,
              appointment
            });

            // Usar envio direto para UAZAPI (não Chatwoot)
            const result = await this.sendDirectToUAZAPI(phoneNumber, message);

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

          const message = this.processTemplate(automation.action_config.message_template || automation.action_config.message, {
            patient,
            appointment
          });

          // Usar envio direto para UAZAPI (não Chatwoot)
          const result = await this.sendDirectToUAZAPI(phoneNumber, message);

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
        const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
        const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
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

      if (error || !automation) {
        throw new Error('Automação não encontrada');
      }

      console.log(`📋 [AutomationManager] Automação encontrada:`, automation.name);

      // Verificar se há filtros
      const hasFilters = automation.filter_config?.filters?.length > 0;
      console.log(`🎯 [AutomationManager] Filtros presentes:`, hasFilters);

      let phoneToUse = '+556185155358'; // Telefone padrão do usuário para testes

      // Se há filtros, tentar encontrar um telefone que corresponda
      if (hasFilters) {
        console.log(`🔍 [AutomationManager] Aplicando filtros para encontrar destinatário de teste`);

        try {
          const filteredPhones = await this.getFilteredTestPhones(automation);
          if (filteredPhones.length > 0) {
            phoneToUse = filteredPhones[0]; // Usar o primeiro telefone encontrado
            console.log(`✅ [AutomationManager] Usando telefone filtrado: ${phoneToUse}`);
          } else {
            console.log(`⚠️ [AutomationManager] Nenhum telefone encontrado com filtros, usando telefone padrão: ${phoneToUse}`);
          }
        } catch (filterError) {
          console.warn(`⚠️ [AutomationManager] Erro ao aplicar filtros, usando telefone padrão:`, filterError.message);
        }
      } else {
        console.log(`📞 [AutomationManager] Sem filtros, usando telefone padrão: ${phoneToUse}`);
      }

      // Criar dados de teste
      const testData = {
        patient: { name: 'Paciente de Teste', phone: phoneToUse },
        appointment: {
          title: 'Consulta de Teste',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      console.log(`📝 [AutomationManager] Dados de teste:`, testData);

      const message = this.processTemplate(automation.action_config.message_template || automation.action_config.message, testData);
      console.log(`💬 [AutomationManager] Mensagem processada:`, message);

      // PARA TESTES: Enviar diretamente para UAZAPI (bypass Chatwoot)
      console.log(`📱 [AutomationManager] Enviando diretamente para UAZAPI...`);
      const result = await this.sendDirectToUAZAPI(phoneToUse, message);

      console.log(`📤 [AutomationManager] Resultado do envio direto:`, result);

      return {
        success: result.success,
        automationId,
        testPhone: phoneToUse,
        originalTestPhone: testPhone,
        message,
        messageId: result.messageId,
        error: result.error,
        filtersApplied: hasFilters,
        phoneChanged: phoneToUse !== testPhone
      };

    } catch (error) {
      console.error('❌ [AutomationManager] Erro no teste:', error.message);
      return {
        success: false,
        automationId,
        testPhone,
        error: error.message
      };
    }
  }

  /**
   * Obtém telefones filtrados para teste
   * @param {Object} automation - Configuração da automação
   * @returns {Promise<Array>} - Lista de telefones que correspondem aos filtros
   */
  async getFilteredTestPhones(automation) {
    const { filter_config, clinic_id } = automation;
    let phones = [];

    try {
      // Aplicar filtros aos contatos/pacientes
      if (filter_config?.filters && filter_config.filters.length > 0) {
        for (const filter of filter_config.filters) {
          const filteredPhones = await this.applyFilterToPhones(filter, clinic_id);
          phones = [...phones, ...filteredPhones];
        }

        // Remover duplicatas
        phones = [...new Set(phones)];
      }

      console.log(`📞 [AutomationManager] Telefones encontrados com filtros: ${phones.length}`);
      return phones.slice(0, 5); // Limitar a 5 telefones para teste

    } catch (error) {
      console.error('❌ [AutomationManager] Erro ao filtrar telefones:', error.message);
      return [];
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
