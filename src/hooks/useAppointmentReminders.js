import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import chatwootService from '@/services/chatwootService';
import { notificationService } from '@/services/notificationService';

/**
 * Hook para gerenciar lembretes automáticos de agendamentos via Chatwoot
 */
export const useAppointmentReminders = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Envia lembrete de agendamento via Chatwoot
   * @param {string} appointmentId - ID do agendamento
   * @param {string} template - Template personalizado (opcional)
   * @param {boolean} forceSend - Forçar envio mesmo que já tenha sido enviado
   * @returns {Promise<Object>} - Resultado do envio
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
            phone,
            avatar_url,
            email
          ),
          contacts:contact_id (
            id,
            name,
            phone,
            avatar_url
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

      // Enviar via Chatwoot
      const result = await chatwootService.sendAppointmentReminder(appointment, patient, template);

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
        notificationService.notify(
          'Lembrete Enviado',
          `Lembrete enviado com sucesso para ${patient.name}`,
          { appointmentId, patientName: patient.name }
        );

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
      notificationService.notify(
        'Erro no Lembrete',
        `Falha ao enviar lembrete: ${err.message}`,
        { appointmentId, error: err.message }
      );

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
   * @param {Array<string>} appointmentIds - IDs dos agendamentos
   * @param {string} template - Template personalizado (opcional)
   * @returns {Promise<Object>} - Resultado do envio em lote
   */
  const sendBulkReminders = useCallback(async (appointmentIds, template = null) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📅 Enviando lembretes em lote para ${appointmentIds.length} agendamentos`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const appointmentId of appointmentIds) {
        try {
          const result = await sendAppointmentReminder(appointmentId, template);
          results.push({
            appointmentId,
            ...result
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }

          // Pequena pausa entre envios para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error(`❌ Erro no agendamento ${appointmentId}:`, err.message);
          results.push({
            appointmentId,
            success: false,
            error: err.message
          });
          errorCount++;
        }
      }

      const summary = {
        total: appointmentIds.length,
        success: successCount,
        errors: errorCount,
        results
      };

      console.log(`📊 Lembretes em lote concluídos: ${successCount} sucesso, ${errorCount} erros`);

      // Notificar resultado
      notificationService.notify(
        'Lembretes Enviados',
        `${successCount} lembretes enviados com sucesso${errorCount > 0 ? `, ${errorCount} falharam` : ''}`,
        summary
      );

      return summary;

    } catch (err) {
      console.error('❌ Erro no envio em lote:', err.message);
      setError(err.message);

      notificationService.notify(
        'Erro nos Lembretes',
        `Falha no envio em lote: ${err.message}`,
        { error: err.message }
      );

      return {
        total: appointmentIds.length,
        success: 0,
        errors: appointmentIds.length,
        error: err.message
      };

    } finally {
      setLoading(false);
    }
  }, [sendAppointmentReminder]);

  /**
   * Busca agendamentos que precisam de lembretes
   * @param {Object} filters - Filtros para buscar agendamentos
   * @returns {Promise<Array>} - Lista de agendamentos
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
            phone,
            avatar_url
          ),
          contacts:contact_id (
            id,
            name,
            phone,
            avatar_url
          )
        `)
        .eq('status', 'scheduled') // Apenas agendamentos confirmados
        .gte('start_time', new Date().toISOString()); // Futuros

      // Aplicar filtros
      if (filters.daysAhead) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.daysAhead);
        query = query.lte('start_time', futureDate.toISOString());
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

  /**
   * Cancela/envia lembretes automáticos agendados
   * @param {string} appointmentId - ID do agendamento
   * @param {boolean} enable - Habilitar ou desabilitar
   * @returns {Promise<Object>} - Resultado da operação
   */
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

      console.log(`✅ Auto-lembrete ${enable ? 'habilitado' : 'desabilitado'} para agendamento ${appointmentId}`);

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

  /**
   * Obtém estatísticas de lembretes enviados
   * @param {Object} dateRange - Período para análise
   * @returns {Promise<Object>} - Estatísticas
   */
  const getReminderStats = useCallback(async (dateRange = {}) => {
    try {
      setLoading(true);

      let query = supabase
        .from('appointments')
        .select('reminder_sent_at, reminder_count, status')
        .not('reminder_sent_at', 'is', null);

      // Aplicar range de datas se fornecido
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
        averagePerAppointment: appointments.reduce((sum, apt) => sum + (apt.reminder_count || 0), 0) / appointments.length,
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
