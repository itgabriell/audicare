import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, ChevronLeft, ChevronRight, Send, MessageSquare, Calendar, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DraggableAppointmentCalendar from '@/components/appointments/DraggableAppointmentCalendar';
import MonthlyCalendarView from '@/components/appointments/MonthlyCalendarView';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { useToast } from '@/components/ui/use-toast';
import { getAppointments, addAppointment, getPatients, createNotification } from '@/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const Appointments = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogInitialData, setDialogInitialData] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const { toast } = useToast();
  const { profile } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const leadIdFromQuery = searchParams.get('leadId');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [appointmentsData, patientsData] = await Promise.all([
        getAppointments(),
        getPatients(1, 1000), // Buscar todos os pacientes para o combobox
      ]);

      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      setPatients(Array.isArray(patientsData?.data) ? patientsData.data : []);
    } catch (error) {
      console.error('[Appointments] Erro ao carregar dados', error);
      toast({
        title: 'Erro ao carregar dados',
        description:
          error?.message ||
          'Falha ao buscar agendamentos ou pacientes. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription para agendamentos
  useEffect(() => {
    if (!profile?.clinic_id) return;

    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${profile.clinic_id}` }, 
        (payload) => {
          console.log('[Realtime] Mudança em agendamento:', payload);
          loadData(); // Recarregar para respeitar ordenação e filtros
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.clinic_id, loadData]);

  // Se vier de um lead do CRM com ?leadId=..., abre o modal automaticamente
  useEffect(() => {
    if (!leadIdFromQuery) return;
    // garante que pacientes foram carregados; se quiser, pode checar appointments também
    if (!patients.length) return;

    setDialogInitialData({
      date: new Date(),
      time: null,
      leadId: leadIdFromQuery,
    });
    setDialogOpen(true);

    // limpa a query para não reabrir sempre
    const params = new URLSearchParams(searchParams);
    params.delete('leadId');
    setSearchParams(params, { replace: true });
  }, [leadIdFromQuery, patients, searchParams, setSearchParams]);

  const handleSaveAppointment = useCallback(async (appointmentData) => {
    try {
      const savedAppointment = await addAppointment(appointmentData);

      const patientName =
        patients.find((p) => p.id === savedAppointment.contact_id)?.name || '';

      setAppointments((prev) => {
        if (editingAppointment) {
          // Atualização: substituir o appointment existente
          return prev.map(app =>
            app.id === editingAppointment.id
              ? { ...savedAppointment, contact: { name: patientName } }
              : app
          );
        } else {
          // Novo: adicionar à lista
          return [
            ...prev,
            { ...savedAppointment, contact: { name: patientName } },
          ];
        }
      });

      // Criar notificações
      try {
        const appointmentDate = format(new Date(savedAppointment.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

        if (editingAppointment) {
          // Notificação de reagendamento
          await createNotification({
            type: 'appointment',
            title: 'Consulta reagendada',
            message: `Consulta de ${patientName} reagendada para ${appointmentDate}`,
            related_entity_type: 'appointment',
            related_entity_id: savedAppointment.id,
            metadata: {
              appointment_id: savedAppointment.id,
              patient_name: patientName,
              new_date: savedAppointment.start_time
            }
          });
        } else {
          // Notificação de novo agendamento
          await createNotification({
            type: 'appointment',
            title: 'Nova consulta agendada',
            message: `Consulta agendada para ${patientName} em ${appointmentDate}`,
            related_entity_type: 'appointment',
            related_entity_id: savedAppointment.id,
            metadata: {
              appointment_id: savedAppointment.id,
              patient_name: patientName,
              appointment_date: savedAppointment.start_time
            }
          });
        }
      } catch (notificationError) {
        console.warn('[Appointments] Erro ao criar notificação:', notificationError);
        // Não falha a operação principal por causa das notificações
      }

      setDialogOpen(false);
      setDialogInitialData(null);
      setEditingAppointment(null);

      toast({
        title: 'Sucesso!',
        description: editingAppointment ? 'Consulta atualizada.' : 'Consulta agendada.'
      });
    } catch (error) {
      console.error('[Appointments] Erro ao salvar consulta', error);
      toast({
        title: 'Erro ao salvar consulta',
        description:
          error?.message ||
          'Não foi possível salvar o agendamento. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  }, [patients, toast, editingAppointment, createNotification]);

  const handleSlotClick = useCallback((date, time) => {
    setDialogInitialData({ date, time });
    setEditingAppointment(null);
    setDialogOpen(true);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setDialogInitialData(null);
    setEditingAppointment(null);
    setDialogOpen(true);
  }, []);

  const changePeriod = useCallback((direction) => {
    if (viewMode === 'week') {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
        return newDate;
      });
    } else if (viewMode === 'day') {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
        return newDate;
      });
    } else {
      // Para modo mês, navegar mês a mês
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
        return newDate;
      });
    }
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleAppointmentClick = useCallback((appointment) => {
    setEditingAppointment(appointment);
    setDialogInitialData({
      ...appointment,
      date: new Date(appointment.start_time),
    });
    setDialogOpen(true);
  }, []);

  const handleAppointmentMove = useCallback(async (appointment, newDate) => {
    try {
      // Salvar data original para notificação
      const originalDate = appointment.start_time;

      // Atualizar a data/hora do agendamento no banco
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newDate.toISOString(),
          rescheduled_from: originalDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Atualizar localmente para feedback imediato
      setAppointments(prev => prev.map(app =>
        app.id === appointment.id
          ? { ...app, start_time: newDate.toISOString() }
          : app
      ));

      // Criar notificação de reagendamento
      try {
        const patientName = appointment.contact?.name || 'Paciente';
        const newDateFormatted = format(newDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

        await createNotification({
          type: 'appointment',
          title: 'Consulta reagendada',
          message: `Consulta de ${patientName} reagendada para ${newDateFormatted}`,
          related_entity_type: 'appointment',
          related_entity_id: appointment.id,
          metadata: {
            appointment_id: appointment.id,
            patient_name: patientName,
            original_date: originalDate,
            new_date: newDate.toISOString()
          }
        });
      } catch (notificationError) {
        console.warn('[Appointments] Erro ao criar notificação de reagendamento:', notificationError);
        // Não falha a operação principal
      }

      toast({
        title: 'Consulta reagendada',
        description: `Movida para ${format(newDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
      });
    } catch (error) {
      console.error('Erro ao mover agendamento:', error);
      toast({
        title: 'Erro ao reagendar',
        description: 'Não foi possível mover a consulta.',
        variant: 'destructive'
      });
      // Recarregar dados para reverter mudança local
      loadData();
    }
  }, [toast, loadData, createNotification]);

  const handleSendConfirmationMessages = useCallback(async (targetDate) => {
    try {
      // Calcular a data alvo
      const target = new Date();
      if (targetDate === 'tomorrow') {
        target.setDate(target.getDate() + 1);
      }
      // Para 'today', já está correto

      // Filtrar agendamentos da data alvo
      const targetAppointments = appointments.filter(app => {
        if (!app.start_time) return false;
        const appDate = new Date(app.start_time);
        return appDate.toDateString() === target.toDateString();
      });

      if (targetAppointments.length === 0) {
        toast({
          title: 'Nenhum agendamento encontrado',
          description: `Não há agendamentos para ${targetDate === 'tomorrow' ? 'amanhã' : 'hoje'}.`,
        });
        return;
      }

      // Aqui você pode implementar a lógica para enviar mensagens
      // Por enquanto, apenas mostra quantos agendamentos foram encontrados
      toast({
        title: 'Gatilho ativado',
        description: `Encontrados ${targetAppointments.length} agendamentos para ${targetDate === 'tomorrow' ? 'amanhã' : 'hoje'}. Funcionalidade de envio será implementada em breve.`,
      });

      // TODO: Implementar envio real de mensagens via WhatsApp API
      console.log('Agendamentos para confirmação:', targetAppointments);

    } catch (error) {
      console.error('Erro ao enviar mensagens de confirmação:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao processar mensagens de confirmação.',
        variant: 'destructive'
      });
    }
  }, [appointments, toast]);

  const handleSendReminderMessages = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtrar agendamentos de hoje
      const todayAppointments = appointments.filter(app => {
        if (!app.start_time) return false;
        const appDate = new Date(app.start_time);
        appDate.setHours(0, 0, 0, 0);
        return appDate.getTime() === today.getTime();
      });

      if (todayAppointments.length === 0) {
        toast({
          title: 'Nenhum agendamento encontrado',
          description: 'Não há agendamentos para hoje.',
        });
        return;
      }

      toast({
        title: 'Lembretes enviados',
        description: `Lembretes enviados para ${todayAppointments.length} agendamentos de hoje.`,
      });

      // TODO: Implementar envio real de lembretes
      console.log('Agendamentos para lembrete:', todayAppointments);

    } catch (error) {
      console.error('Erro ao enviar lembretes:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao processar lembretes.',
        variant: 'destructive'
      });
    }
  }, [appointments, toast]);

  const monthLabel = useMemo(() => {
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }, [currentDate]);

  return (
    <>
      <Helmet>
        <title>Agenda - Audicare</title>
        <meta
          name="description"
          content="Agenda de consultas da clínica"
        />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerenciamento de consultas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleToday}>
              Hoje
            </Button>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Consulta
            </Button>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-card rounded-xl shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Ações Rápidas
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleSendConfirmationMessages('tomorrow')}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Confirmar Consultas de Amanhã
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendConfirmationMessages('today')}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Confirmar Consultas de Hoje
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendReminderMessages()}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Lembretes de Hoje
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use essas ações para enviar mensagens automáticas aos pacientes sobre seus agendamentos.
          </p>
        </div>

        {/* Calendário */}
        <div className="bg-card rounded-xl shadow-sm border p-4">
          {/* Controles de navegação e visualização */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => changePeriod('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-lg font-semibold text-foreground capitalize min-w-[200px] text-center">
                {viewMode === 'week'
                  ? `Semana de ${format(currentDate, "dd/MM", { locale: ptBR })}`
                  : monthLabel
                }
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={() => changePeriod('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Seletor de modo de visualização */}
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="flex items-center gap-1"
                >
                  <List className="h-4 w-4" />
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="flex items-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Mês
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="flex items-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Dia
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'week' ? (
            <DraggableAppointmentCalendar
              currentDate={currentDate}
              appointments={appointments}
              onSlotClick={handleSlotClick}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentMove={handleAppointmentMove}
            />
          ) : viewMode === 'day' ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
              </div>
              <div className="space-y-2">
                {(() => {
                  const dayAppointments = appointments.filter(app => {
                    if (!app.start_time) return false;
                    const appDate = new Date(app.start_time);
                    return appDate.toDateString() === currentDate.toDateString();
                  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

                  if (dayAppointments.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum agendamento para este dia</p>
                      </div>
                    );
                  }

                  return dayAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-primary">
                            {(() => {
                              const date = new Date(appointment.start_time);
                              // Exibir exatamente a hora cadastrada, sem conversões de timezone
                              return date.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                            })()}
                          </div>
                          <div>
                            <div
                              className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/patients/${appointment.patient_id}`;
                              }}
                              title="Clique para ver/completar o cadastro do paciente"
                            >
                              {appointment.contact?.name || 'Paciente'}
                            </div>
                            <div className="text-sm text-muted-foreground">{appointment.title || appointment.appointment_type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'arrived' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            appointment.status === 'no_show' ? 'bg-red-100 text-red-800' :
                            appointment.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            appointment.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-800' :
                            appointment.status === 'not_confirmed' ? 'bg-orange-100 text-orange-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {appointment.status === 'confirmed' ? 'Confirmado' :
                             appointment.status === 'arrived' ? 'Chegou' :
                             appointment.status === 'completed' ? 'Concluído' :
                             appointment.status === 'no_show' ? 'Não Compareceu' :
                             appointment.status === 'cancelled' ? 'Cancelado' :
                             appointment.status === 'rescheduled' ? 'Reagendado' :
                             appointment.status === 'not_confirmed' ? 'Não Confirmado' :
                             'Agendado'}
                          </div>
                        </div>
                      </div>
                      {appointment.obs && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {appointment.obs}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          ) : (
            <MonthlyCalendarView
              currentDate={currentDate}
              appointments={appointments}
              onDayClick={(date) => {
                // Ao clicar em um dia no modo mês, alterna para visualização semanal daquele dia
                setViewMode('week');
                setCurrentDate(date);
              }}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
        </div>

        {/* Dialog de nova/edição de consulta */}
        <AppointmentDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setDialogInitialData(null);
              setEditingAppointment(null);
            }
          }}
          appointment={editingAppointment}
          onSave={handleSaveAppointment}
          onUpdate={loadData}
          patients={Array.isArray(patients) ? patients : []}
          onPatientsUpdate={setPatients}
          initialData={dialogInitialData}
        />
      </div>
    </>
  );
};

export default Appointments;
