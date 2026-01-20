const cron = require('node-cron');
const { supabase } = require('../lib/customSupabaseClient');
const chatwootBackendService = require('./ChatwootBackendService');

/**
 * Sistema de Automação de Engajamento do Paciente
 * Gerencia automações via Chatwoot com controle total do usuário
 */
class PatientEngagementAutomation {
  constructor() {
    this.automations = {
      birthday: {
        enabled: process.env.AUTOMATION_BIRTHDAY_ENABLED === 'true',
        schedule: '0 9 * * *', // Todo dia às 9:00
        message: process.env.AUTOMATION_BIRTHDAY_MESSAGE ||
          '🎉 Feliz Aniversário! 🎂\n\nQue seu dia seja repleto de alegria e saúde! Que tal agendar uma consulta para verificar seus aparelhos?\n\nAtenciosamente,\nClínica Audicare'
      },
      appointment_confirmation: {
        enabled: process.env.AUTOMATION_CONFIRMATION_ENABLED === 'true',
        schedule: '0 8 * * *', // Todo dia às 8:00
        daysAhead: parseInt(process.env.AUTOMATION_CONFIRMATION_DAYS_AHEAD) || 2,
        message: process.env.AUTOMATION_CONFIRMATION_MESSAGE ||
          'Olá {{nome}}! 👋\n\nLembrando que sua consulta está agendada para {{data}} às {{hora}}.\n\nPor favor, responda SIM para confirmar sua presença ou NOSSO contato para reagendar.\n\nAtenciosamente,\nClínica Audicare'
      },
      welcome_checkin: {
        enabled: process.env.AUTOMATION_WELCOME_ENABLED === 'true',
        message: process.env.AUTOMATION_WELCOME_MESSAGE ||
          'Olá {{nome}}! 👋\n\nVimos que você chegou para sua consulta. Estamos preparando tudo para te atender!\n\nSe precisar de algo, é só falar.\n\nAtenciosamente,\nClínica Audicare'
      },
      goodbye_checkout: {
        enabled: process.env.AUTOMATION_GOODBYE_ENABLED === 'true',
        message: process.env.AUTOMATION_GOODBYE_MESSAGE ||
          'Olá {{nome}}! 👋\n\nObrigado por confiar na Clínica Audicare!\n\nEsperamos te ver novamente em breve. Cuide-se bem! 💙\n\nAtenciosamente,\nClínica Audicare'
      }
    };

    this.initializeCronJobs();
  }

  /**
   * Inicializa os cron jobs
   */
  initializeCronJobs() {
    console.log('🔄 [Automation] Inicializando cron jobs...');

    // Aniversariantes - Todo dia às 9:00
    if (this.automations.birthday.enabled) {
      cron.schedule(this.automations.birthday.schedule, async () => {
        console.log('🎂 [Automation] Executando automação de aniversariantes...');
        await this.sendBirthdayMessages();
      });
      console.log('✅ [Automation] Cron job de aniversariantes ativado');
    }

    // Confirmação de consultas - Todo dia às 8:00
    if (this.automations.appointment_confirmation.enabled) {
      cron.schedule(this.automations.appointment_confirmation.schedule, async () => {
        console.log('📅 [Automation] Executando confirmação de consultas...');
        await this.sendAppointmentConfirmations();
      });
      console.log('✅ [Automation] Cron job de confirmação de consultas ativado');
    }
  }

  /**
   * Envia mensagens de aniversário para pacientes
   * @returns {Promise<Array>} - Resultados dos envios
   */
  async sendBirthdayMessages() {
    try {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      console.log(`🎂 [Automation] Buscando aniversariantes do dia: ${todayStr}`);

      // Buscar pacientes que fazem aniversário hoje
      // Nota: Como não temos campo de data de nascimento separado,
      // vamos usar uma abordagem baseada em filtros ou campos customizados
      const { data: patients, error } = await supabase
        .from('patients')
        .select(`
          id,
          name,
          phone,
          created_at,
          phones:patient_phones(phone, is_primary, is_whatsapp)
        `)
        .not('phone', 'is', null)
        .neq('phone', '')
        .limit(100); // Limitar para evitar sobrecarga

      if (error) throw error;

      const results = [];
      let sentCount = 0;

      for (const patient of patients || []) {
        try {
          // Verificar se faz aniversário hoje (lógica simplificada)
          // Em produção, você pode ter um campo birth_date separado
          const shouldSend = this.shouldSendBirthdayMessage(patient, todayStr);

          if (shouldSend) {
            const phoneNumber = this.getPrimaryPhoneNumber(patient);

            if (phoneNumber) {
              const message = this.processBirthdayTemplate(this.automations.birthday.message, patient);

              const result = await chatwootBackendService.sendMessage(phoneNumber, message);
              results.push({
                patientId: patient.id,
                patientName: patient.name,
                phone: phoneNumber,
                success: result.success,
                error: result.error
              });

              if (result.success) sentCount++;
            }
          }
        } catch (error) {
          console.error(`❌ [Automation] Erro no paciente ${patient.id}:`, error.message);
          results.push({
            patientId: patient.id,
            patientName: patient.name,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`🎂 [Automation] Aniversariantes processados: ${sentCount} mensagens enviadas`);
      return results;

    } catch (error) {
      console.error('❌ [Automation] Erro na automação de aniversariantes:', error.message);
      throw error;
    }
  }

  /**
   * Envia confirmações de consulta (48h antes)
   * @returns {Promise<Array>} - Resultados dos envios
   */
  async sendAppointmentConfirmations() {
    try {
      const daysAhead = this.automations.appointment_confirmation.daysAhead;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);

      const targetDateStr = targetDate.toISOString().split('T')[0];

      console.log(`📅 [Automation] Buscando consultas para: ${targetDateStr} (${daysAhead} dias à frente)`);

      // Buscar agendamentos para a data alvo
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          title,
          status,
          patient_id,
          patients:patient_id (
            id,
            name,
            phone,
            phones:patient_phones(phone, is_primary, is_whatsapp)
          )
        `)
        .eq('status', 'scheduled')
        .gte('start_time', `${targetDateStr}T00:00:00.000Z`)
        .lt('start_time', `${targetDateStr}T23:59:59.999Z`);

      if (error) throw error;

      const results = [];
      let sentCount = 0;

      for (const appointment of appointments || []) {
        try {
          const patient = appointment.patients;
          if (!patient) continue;

          const phoneNumber = this.getPrimaryPhoneNumber(patient);

          if (phoneNumber) {
            const message = this.processAppointmentTemplate(
              this.automations.appointment_confirmation.message,
              appointment,
              patient
            );

            const result = await chatwootBackendService.sendMessage(phoneNumber, message);
            results.push({
              appointmentId: appointment.id,
              patientId: patient.id,
              patientName: patient.name,
              phone: phoneNumber,
              appointmentDate: appointment.start_time,
              success: result.success,
              error: result.error
            });

            if (result.success) sentCount++;
          }
        } catch (error) {
          console.error(`❌ [Automation] Erro na consulta ${appointment.id}:`, error.message);
          results.push({
            appointmentId: appointment.id,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`📅 [Automation] Confirmações enviadas: ${sentCount} mensagens`);
      return results;

    } catch (error) {
      console.error('❌ [Automation] Erro na automação de confirmações:', error.message);
      throw error;
    }
  }

  /**
   * Processa mudança de status do agendamento e dispara automações
   * @param {string} appointmentId - ID do agendamento
   * @param {string} newStatus - Novo status
   * @param {string} oldStatus - Status anterior
   * @returns {Promise<Object>} - Resultado do processamento
   */
  async processAppointmentStatusChange(appointmentId, newStatus, oldStatus) {
    try {
      console.log(`🔄 [Automation] Processando mudança de status: ${oldStatus} → ${newStatus} (ID: ${appointmentId})`);

      // Buscar dados completos do agendamento
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          title,
          status,
          patient_id,
          patients:patient_id (
            id,
            name,
            phone,
            phones:patient_phones(phone, is_primary, is_whatsapp)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        console.warn(`⚠️ [Automation] Agendamento não encontrado: ${appointmentId}`);
        return { success: false, reason: 'appointment_not_found' };
      }

      const patient = appointment.patients;
      if (!patient) {
        console.warn(`⚠️ [Automation] Paciente não encontrado para agendamento: ${appointmentId}`);
        return { success: false, reason: 'patient_not_found' };
      }

      const phoneNumber = this.getPrimaryPhoneNumber(patient);
      if (!phoneNumber) {
        console.warn(`⚠️ [Automation] Telefone não encontrado para paciente: ${patient.name}`);
        return { success: false, reason: 'no_phone' };
      }

      let automationType = null;
      let message = null;

      // Determinar qual automação disparar baseado no novo status
      switch (newStatus) {
        case 'arrived':
          if (this.automations.welcome_checkin.enabled) {
            automationType = 'welcome_checkin';
            message = this.processWelcomeTemplate(this.automations.welcome_checkin.message, appointment, patient);
          }
          break;

        case 'completed':
          if (this.automations.goodbye_checkout.enabled) {
            automationType = 'goodbye_checkout';
            message = this.processGoodbyeTemplate(this.automations.goodbye_checkout.message, appointment, patient);
          }
          break;
      }

      if (automationType && message) {
        console.log(`🚀 [Automation] Disparando automação: ${automationType}`);

        const result = await chatwootBackendService.sendMessage(phoneNumber, message);

        return {
          success: result.success,
          automationType,
          patientId: patient.id,
          patientName: patient.name,
          phone: phoneNumber,
          appointmentId,
          messageId: result.messageId,
          error: result.error
        };
      }

      // Status não dispara automação
      return { success: true, reason: 'no_automation_triggered' };

    } catch (error) {
      console.error('❌ [Automation] Erro no processamento de status:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica se deve enviar mensagem de aniversário
   * @param {Object} patient - Dados do paciente
   * @param {string} todayStr - Data de hoje (MM-DD)
   * @returns {boolean}
   */
  shouldSendBirthdayMessage(patient, todayStr) {
    // Lógica simplificada - em produção você pode ter um campo birth_date
    // Por enquanto, vamos usar uma lógica baseada em filtros ou campos customizados
    // Esta é uma implementação básica que pode ser expandida

    // Exemplo: verificar se o paciente foi criado hoje (não é ideal, mas funciona como exemplo)
    if (patient.created_at) {
      const createdDate = new Date(patient.created_at);
      const createdMonthDay = `${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
      return createdMonthDay === todayStr;
    }

    return false;
  }

  /**
   * Obtém o número de telefone principal do paciente
   * @param {Object} patient - Dados do paciente
   * @returns {string|null} - Número de telefone
   */
  getPrimaryPhoneNumber(patient) {
    // Primeiro tentar telefone principal dos phones
    if (patient.phones && patient.phones.length > 0) {
      const primaryPhone = patient.phones.find(p => p.is_primary && p.is_whatsapp);
      if (primaryPhone) return primaryPhone.phone;

      const whatsappPhone = patient.phones.find(p => p.is_whatsapp);
      if (whatsappPhone) return whatsappPhone.phone;

      // Última opção: primeiro telefone
      return patient.phones[0].phone;
    }

    // Fallback para o campo phone direto
    return patient.phone;
  }

  /**
   * Processa template de mensagem de aniversário
   * @param {string} template - Template da mensagem
   * @param {Object} patient - Dados do paciente
   * @returns {string} - Mensagem processada
   */
  processBirthdayTemplate(template, patient) {
    return template
      .replace(/\{\{nome\}\}/g, patient.name || 'Paciente');
  }

  /**
   * Processa template de mensagem de consulta
   * @param {string} template - Template da mensagem
   * @param {Object} appointment - Dados do agendamento
   * @param {Object} patient - Dados do paciente
   * @returns {string} - Mensagem processada
   */
  processAppointmentTemplate(template, appointment, patient) {
    const appointmentDate = new Date(appointment.start_time);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
    const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return template
      .replace(/\{\{nome\}\}/g, patient.name || 'Paciente')
      .replace(/\{\{data\}\}/g, formattedDate)
      .replace(/\{\{hora\}\}/g, formattedTime);
  }

  /**
   * Processa template de mensagem de boas-vindas
   * @param {string} template - Template da mensagem
   * @param {Object} appointment - Dados do agendamento
   * @param {Object} patient - Dados do paciente
   * @returns {string} - Mensagem processada
   */
  processWelcomeTemplate(template, appointment, patient) {
    return template
      .replace(/\{\{nome\}\}/g, patient.name || 'Paciente');
  }

  /**
   * Processa template de mensagem de despedida
   * @param {string} template - Template da mensagem
   * @param {Object} appointment - Dados do agendamento
   * @param {Object} patient - Dados do paciente
   * @returns {string} - Mensagem processada
   */
  processGoodbyeTemplate(template, appointment, patient) {
    return template
      .replace(/\{\{nome\}\}/g, patient.name || 'Paciente');
  }

  /**
   * Atualiza configurações das automações
   * @param {Object} newSettings - Novas configurações
   */
  updateSettings(newSettings) {
    if (newSettings.birthday) {
      this.automations.birthday = { ...this.automations.birthday, ...newSettings.birthday };
    }
    if (newSettings.appointment_confirmation) {
      this.automations.appointment_confirmation = { ...this.automations.appointment_confirmation, ...newSettings.appointment_confirmation };
    }
    if (newSettings.welcome_checkin) {
      this.automations.welcome_checkin = { ...this.automations.welcome_checkin, ...newSettings.welcome_checkin };
    }
    if (newSettings.goodbye_checkout) {
      this.automations.goodbye_checkout = { ...this.automations.goodbye_checkout, ...newSettings.goodbye_checkout };
    }

    console.log('✅ [Automation] Configurações atualizadas');
  }

  /**
   * Obtém configurações atuais das automações
   * @returns {Object} - Configurações atuais
   */
  getSettings() {
    return { ...this.automations };
  }

  /**
   * Executa teste manual de uma automação
   * @param {string} automationType - Tipo da automação
   * @param {string} targetPhone - Telefone para teste
   * @param {Object} testData - Dados para teste
   * @returns {Promise<Object>} - Resultado do teste
   */
  async testAutomation(automationType, targetPhone, testData = {}) {
    try {
      console.log(`🧪 [Automation] Testando automação: ${automationType}`);

      let message = null;

      switch (automationType) {
        case 'birthday':
          message = this.processBirthdayTemplate(this.automations.birthday.message, testData.patient || {});
          break;

        case 'appointment_confirmation':
          message = this.processAppointmentTemplate(
            this.automations.appointment_confirmation.message,
            testData.appointment || {},
            testData.patient || {}
          );
          break;

        case 'welcome_checkin':
          message = this.processWelcomeTemplate(this.automations.welcome_checkin.message, testData.appointment || {}, testData.patient || {});
          break;

        case 'goodbye_checkout':
          message = this.processGoodbyeTemplate(this.automations.goodbye_checkout.message, testData.appointment || {}, testData.patient || {});
          break;

        default:
          console.error(`❌ [Automation] Tipo de automação desconhecido: "${automationType}"`);
          throw new Error(`Tipo de automação desconhecido: ${automationType}`);
      }

      if (!message) {
        throw new Error('Template não encontrado para o tipo de automação');
      }

      const result = await chatwootBackendService.sendMessage(targetPhone, message);

      return {
        success: result.success,
        automationType,
        targetPhone,
        message,
        messageId: result.messageId,
        error: result.error
      };

    } catch (error) {
      console.error('❌ [Automation] Erro no teste:', error.message);
      return {
        success: false,
        automationType,
        targetPhone,
        error: error.message
      };
    }
  }
}

module.exports = new PatientEngagementAutomation();
