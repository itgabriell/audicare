import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { chatwootService } from '@/services/chatwootService';
import { notificationService } from '@/services/notificationService';

/**
 * Hook para gerenciar lembretes automáticos de agendamentos via Chatwoot
 */
export const useAppointmentReminders = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Envia lembrete de agendamento via Chatwoot
   */
  const sendAppointmentReminder = useCallback(async (appointmentId, template = null, forceSend = false) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados completos do agendamento
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            phone
          ),
          contacts:contact_id (
            id,
            name,
            phone
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error('Agendamento não encontrado');
      }

      // Verificar se já foi enviado (exceto se forçado)
      if (!forceSend && appointment.reminder_sent_at) {
        console.log('ℹ️ Lembrete já enviado anteriormente');
        return {
          success: false,
          message: 'Lembrete já foi enviado anteriormente',
          alreadySent: true
        };
      }

      // Validar dados necessários
      const patient = appointment.patients;
      if (!patient) {
        throw new Error('Dados do paciente não encontrados');
      }

      console.log(`📅 Enviando lembrete para agendamento ${appointmentId} - Paciente: ${patient.name}`);

      // --- TEMPLATE E VARIÁVEIS ---
      const date = new Date(appointment.start_time).toLocaleDateString('pt-BR');
      const time = new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const professionalName = appointment.contacts?.name || 'Dra Karine'; // Fallback se não tiver contato
      const firstName = patient.name.split(' ')[0]; // Primeiro nome

      // Saudação baseada no horário ATUAL (do envio)
      const currentHour = new Date().getHours();
      let greeting = 'Bom dia';
      if (currentHour >= 12 && currentHour < 18) greeting = 'Boa tarde';
      if (currentHour >= 18) greeting = 'Boa noite';

      // Template padrão solicitado
      // "Olá, boa tarde Janffran! Você tem um compromisso com a Dra Karine amanhã, dia 29/01/26, às 11:00. Podemos confirmar a sua vinda? Aguardamos seu retorno, obrigada!😉"
      let message = template || `Olá, ${greeting.toLowerCase()} ${firstName}! Você tem um compromisso com a ${professionalName} amanhã, dia ${date}, às ${time}. Podemos confirmar a sua vinda?\n\nAguardamos seu retorno, obrigada!😉`;

      // Substituição de variáveis no template customizado
      message = message
        .replace('{patient_name}', patient.name)
        .replace('{first_name}', firstName)
        .replace('{professional_name}', professionalName)
        .replace('{date}', date)
        .replace('{time}', time)
        .replace('{greeting}', greeting);

      // --- ENVIO VIA CHATWOOT (PROXY) ---
      const result = await chatwootService.sendAppointmentReminder(appointment, patient, message);

      if (result.success) {
        // Registrar no banco que o lembrete foi enviado
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            reminder_sent_at: new Date().toISOString(),
            reminder_count: (appointment.reminder_count || 0) + 1
          })
          .eq('id', appointmentId);

        if (updateError) {
          console.warn('⚠️ Erro ao atualizar status do lembrete:', updateError.message);
        }

        // Notificar usuário localmente
        if (notificationService) {
          notificationService.notify(
            'Lembrete Enviado',
            `Lembrete enviado com sucesso para ${patient.name}`,
            { appointmentId, patientName: patient.name }
          );
        }

        console.log(`✅ Lembrete enviado com sucesso para ${patient.name}`);
        return {
          success: true,
          message: `Lembrete enviado para ${patient.name}`,
          result
        };

      } else {
        throw new Error(result.error || 'Erro desconhecido ao enviar lembrete');
      }

    } catch (err) {
      console.error('❌ Erro ao enviar lembrete:', err.message);
      setError(err.message);

      // Notificar erro
      if (notificationService) {
        notificationService.notify(
          'Erro no Lembrete',
          `Falha ao enviar lembrete: ${err.message}`,
          { appointmentId, error: err.message }
        );
      }

      return {
        success: false,
        message: err.message,
        error: err.message
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Envia lembretes em lote para múltiplos agendamentos
   */
  const sendBulkReminders = useCallback(async (appointmentIds, template = null) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📅 Enviando lembretes em lote para ${appointmentIds.length} agendamentos`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;
      const successes = [];
      const failures = [];

      for (const appointmentId of appointmentIds) {
        // Obter nome preliminar (será atualizado após sucesso/falha individual)
        let patientName = `Agendamento ${appointmentId}`;

        try {
          const result = await sendAppointmentReminder(appointmentId, template);

          // Tenta extrair o nome do resultado ou mantém o ID
          if (result.message && result.message.includes('para ')) {
            patientName = result.message.split('para ')[1];
          }

          results.push({
            appointmentId,
            patientName,
            ...result
          });

          if (result.success) {
            successCount++;
            successes.push({ appointmentId, patientName });
          } else {
            errorCount++;
            failures.push({ appointmentId, patientName, error: result.error });
          }

          // Pequena pausa entre envios para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error(`❌ Erro no agendamento ${appointmentId}:`, err.message);
          const failureData = {
            appointmentId,
            patientName,
            success: false,
            error: err.message
          };
          results.push(failureData);
          failures.push(failureData);
          errorCount++;
        }
      }

      const summary = {
        total: appointmentIds.length,
        success: successCount,
        errors: errorCount,
        results,
        successes,
        failures
      };

      console.log(`📊 Lembretes em lote concluídos: ${successCount} sucesso, ${errorCount} erros`);

      // Notificação interna (serviço global)
      if (notificationService) {
        notificationService.notify(
          'Lembretes Processados',
          `${successCount} enviados com sucesso. ${errorCount} falhas.`,
          summary
        );
      }

      return summary;

    } catch (err) {
      console.error('❌ Erro no envio em lote:', err.message);
      setError(err.message);
      return {
        total: appointmentIds.length,
        success: 0,
        errors: appointmentIds.length,
        error: err.message,
        results: [],
        successes: [],
        failures: appointmentIds.map(id => ({ appointmentId: id, error: err.message }))
      };

    } finally {
      setLoading(false);
    }
  }, [sendAppointmentReminder]);

  /**
   * Busca agendamentos que precisam de lembretes
   */
  const getAppointmentsForReminders = useCallback(async (filters = {}) => {
    try {
      setLoading(true);

      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          title,
          status,
          reminder_sent_at,
          reminder_count,
          patients:patient_id (
            id,
            name,
            phone
          ),
          contacts:contact_id (
            id,
            name,
            phone
          )
        `)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString());

      if (filters.daysAhead !== undefined) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.daysAhead);

        // Define o início do dia alvo (00:00:00)
        const targetStart = new Date(futureDate);
        targetStart.setHours(0, 0, 0, 0);

        // Define o fim do dia alvo (23:59:59)
        const targetEnd = new Date(futureDate);
        targetEnd.setHours(23, 59, 59, 999);

        query = query.gte('start_time', targetStart.toISOString())
          .lte('start_time', targetEnd.toISOString());
      }

      if (filters.withoutReminders) {
        query = query.is('reminder_sent_at', null);
      }

      if (filters.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }

      const { data: appointments, error } = await query
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Filtrar apenas aqueles com telefone válido
      const validAppointments = appointments.filter(apt => {
        const phone = apt.contacts?.phone || apt.patients?.phone;
        return phone && phone.replace(/\D/g, '').length >= 10;
      });

      console.log(`📅 Encontrados ${validAppointments.length} agendamentos elegíveis para lembretes`);

      return validAppointments || [];

    } catch (err) {
      console.error('❌ Erro ao buscar agendamentos:', err.message);
      setError(err.message);
      return [];

    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAutoReminder = useCallback(async (appointmentId, enable) => {
    try {
      setLoading(true);

      const updateData = enable
        ? { auto_reminder_enabled: true }
        : { auto_reminder_enabled: false };

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      return {
        success: true,
        message: `Auto-lembrete ${enable ? 'habilitado' : 'desabilitado'}`
      };

    } catch (err) {
      console.error('❌ Erro ao alterar auto-lembrete:', err.message);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getReminderStats = useCallback(async (dateRange = {}) => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select('reminder_sent_at, reminder_count, status')
        .not('reminder_sent_at', 'is', null);

      if (dateRange.start) {
        query = query.gte('reminder_sent_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('reminder_sent_at', dateRange.end);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      const stats = {
        totalSent: appointments.length,
        averagePerAppointment: appointments.length ? appointments.reduce((sum, apt) => sum + (apt.reminder_count || 0), 0) / appointments.length : 0,
        byStatus: appointments.reduce((acc, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1;
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      };
      return stats;
    } catch (err) {
      console.error('❌ Erro ao obter estatísticas:', err.message);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    sendAppointmentReminder,
    sendBulkReminders,
    getAppointmentsForReminders,
    toggleAutoReminder,
    getReminderStats,
    clearError: () => setError(null)
  };
};

export default useAppointmentReminders;