import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, ChevronLeft, ChevronRight, Send, MessageSquare, Calendar, List, Loader2, Clock, MapPin, User, Home } from 'lucide-react';
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
import { useAppointmentReminders } from '@/hooks/useAppointmentReminders';
import { useAppointments } from '@/hooks/useAppointments'; // Importando o hook correto

const Appointments = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  
  // Usando o Hook centralizado para gerenciar estado e ações
  const { 
      appointments, 
      loading, 
      refetch: loadAppointments, 
      deleteAppointment 
  } = useAppointments();

  const [dialogInitialData, setDialogInitialData] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  
  // MUDANÇA: View padrão agora é 'day'
  const [viewMode, setViewMode] = useState('day'); 
  
  const [processingAction, setProcessingAction] = useState(null);

  const { toast } = useToast();
  const { profile } = useAuth();
  
  const { 
      getAppointmentsForReminders, 
      sendBulkReminders, 
      loading: remindersLoading 
  } = useAppointmentReminders();

  const [searchParams, setSearchParams] = useSearchParams();
  const leadIdFromQuery = searchParams.get('leadId');

  // Carregar pacientes apenas (agendamentos vêm do hook)
  useEffect(() => {
    const fetchPatients = async () => {
        const patientsData = await getPatients(1, 1000);
        setPatients(Array.isArray(patientsData?.data) ? patientsData.data : []);
    };
    fetchPatients();
  }, []);

  // Abrir modal se vier do CRM
  useEffect(() => {
    if (!leadIdFromQuery) return;
    if (!patients.length) return;

    setDialogInitialData({
      date: new Date(),
      time: null,
      leadId: leadIdFromQuery,
    });
    setDialogOpen(true);

    const params = new URLSearchParams(searchParams);
    params.delete('leadId');
    setSearchParams(params, { replace: true });
  }, [leadIdFromQuery, patients, searchParams, setSearchParams]);

  // --- AÇÕES RÁPIDAS ---
  const handleQuickAction = async (actionType) => {
      setProcessingAction(actionType);
      try {
          let targetAppointments = [];
          let successMessage = "";
          let emptyMessage = "";

          if (actionType === 'confirm_tomorrow') {
              targetAppointments = await getAppointmentsForReminders({ daysAhead: 1 });
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              targetAppointments = targetAppointments.filter(apt => 
                  new Date(apt.start_time).toDateString() === tomorrow.toDateString()
              );
              successMessage = "Mensagens de confirmação enviadas para amanhã!";
              emptyMessage = "Nenhum agendamento encontrado para amanhã.";
          
          } else if (actionType === 'confirm_today') {
              targetAppointments = await getAppointmentsForReminders({ daysAhead: 0 });
              const today = new Date();
              targetAppointments = targetAppointments.filter(apt => 
                  new Date(apt.start_time).toDateString() === today.toDateString()
              );
              successMessage = "Mensagens de confirmação enviadas para hoje!";
              emptyMessage = "Nenhum agendamento encontrado para hoje.";
          
          } else if (actionType === 'reminders_today') {
              targetAppointments = await getAppointmentsForReminders({ daysAhead: 0 });
              const today = new Date();
              targetAppointments = targetAppointments.filter(apt => 
                  new Date(apt.start_time).toDateString() === today.toDateString()
              );
              successMessage = "Lembretes enviados com sucesso!";
              emptyMessage = "Nenhum agendamento para enviar lembretes hoje.";
          }

          if (targetAppointments.length === 0) {
              toast({ title: "Aviso", description: emptyMessage });
              return;
          }

          const ids = targetAppointments.map(a => a.id);
          const result = await sendBulkReminders(ids);

          if (result.success > 0) {
              toast({ title: "Sucesso", description: `${successMessage} (${result.success} enviados)` });
          } else {
              toast({ variant: "destructive", title: "Erro", description: "Falha ao enviar mensagens." });
          }

      } catch (error) {
          console.error("Erro na ação rápida:", error);
          toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao processar a ação." });
      } finally {
          setProcessingAction(null);
      }
  };

  const handleSaveAppointment = useCallback(async (appointmentData) => {
    try {
      const savedAppointment = await addAppointment(appointmentData);
      
      // Atualiza via refetch do hook para garantir consistência
      loadAppointments();

      // Notificação
      try {
        const patientName = patients.find((p) => p.id === savedAppointment.contact_id)?.name || 'Paciente';
        const appointmentDate = format(new Date(savedAppointment.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        
        await createNotification({
            type: 'appointment',
            title: editingAppointment ? 'Consulta reagendada' : 'Nova consulta agendada',
            message: `Consulta de ${patientName} para ${appointmentDate}`,
            related_entity_type: 'appointment',
            related_entity_id: savedAppointment.id,
            metadata: { appointment_id: savedAppointment.id }
        });
      } catch (e) { console.warn('Erro notificação:', e); }

      setDialogOpen(false);
      setDialogInitialData(null);
      setEditingAppointment(null);
      toast({ title: 'Sucesso!', description: 'Agendamento salvo.' });

    } catch (error) {
      console.error('[Appointments] Erro ao salvar', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  }, [patients, toast, editingAppointment, createNotification, loadAppointments]);

  // Função de Deletar para passar pro Dialog
  const handleDeleteAppointment = async (id) => {
      const { success } = await deleteAppointment(id);
      if (success) {
          toast({ title: "Agendamento excluído" });
          setDialogOpen(false);
      } else {
          toast({ title: "Erro ao excluir", variant: "destructive" });
      }
  };

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
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;
      
      loadAppointments(); // Atualiza via hook
      toast({ title: 'Consulta reagendada', description: `Movida para ${format(newDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` });
    } catch (error) {
      toast({ title: 'Erro ao reagendar', description: 'Não foi possível mover a consulta.', variant: 'destructive' });
    }
  }, [toast, loadAppointments]);

  const monthLabel = useMemo(() => {
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }, [currentDate]);

  return (
    <>
      <Helmet>
        <title>Agenda - Audicare</title>
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
            <Button variant="outline" onClick={() => handleQuickAction('confirm_tomorrow')} disabled={!!processingAction} className="flex items-center gap-2">
              {processingAction === 'confirm_tomorrow' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirmar Amanhã
            </Button>
            <Button variant="outline" onClick={() => handleQuickAction('confirm_today')} disabled={!!processingAction} className="flex items-center gap-2">
              {processingAction === 'confirm_today' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirmar Hoje
            </Button>
            <Button variant="outline" onClick={() => handleQuickAction('reminders_today')} disabled={!!processingAction} className="flex items-center gap-2">
              {processingAction === 'reminders_today' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Lembretes Hoje
            </Button>
          </div>
        </div>

        {/* Calendário Principal */}
        <div className="bg-card rounded-xl shadow-sm border p-4">
          
          {/* Barra de Controles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            
            {/* Navegação de Data */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => changePeriod('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-lg font-semibold text-foreground capitalize min-w-[200px] text-center">
                {viewMode === 'day' 
                  ? format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                  : viewMode === 'week'
                    ? `Semana de ${format(currentDate, "dd/MM", { locale: ptBR })}`
                    : monthLabel
                }
              </h2>

              <Button variant="outline" size="icon" onClick={() => changePeriod('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtros de Visualização (Ordem Invertida: Dia - Semana - Mês) */}
            <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="flex items-center gap-1 text-xs px-3"
                >
                  Dia
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="flex items-center gap-1 text-xs px-3"
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="flex items-center gap-1 text-xs px-3"
                >
                  Mês
                </Button>
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
             /* --- VISUALIZAÇÃO DIÁRIA (BOX ARREDONDADO) --- */
             <div className="space-y-4 min-h-[400px]">
                {(() => {
                  const dayAppointments = appointments.filter(app => {
                    if (!app.start_time) return false;
                    const appDate = new Date(app.start_time);
                    return appDate.toDateString() === currentDate.toDateString();
                  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

                  if (dayAppointments.length === 0) {
                    return (
                      <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
                        <Calendar className="h-12 w-12 opacity-20" />
                        <p>Nenhum agendamento para este dia.</p>
                        <Button variant="outline" onClick={handleOpenDialog}>Agendar agora</Button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dayAppointments.map(app => {
                            const isDomiciliar = app.type === 'domiciliar' || app.location?.toLowerCase() === 'domiciliar';
                            
                            return (
                                <div 
                                    key={app.id} 
                                    onClick={() => handleAppointmentClick(app)} 
                                    className={`
                                        group relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all hover:shadow-md cursor-pointer
                                        ${isDomiciliar ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' : 'bg-card hover:border-primary/50'}
                                    `}
                                >
                                    {/* Faixa lateral colorida */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDomiciliar ? 'bg-blue-500' : 'bg-primary'}`} />
                                    
                                    <div className="flex justify-between items-start mb-2 pl-2">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold text-foreground flex items-center gap-2">
                                                {new Date(app.start_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                                {isDomiciliar && (
                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                        <Home className="h-3 w-3" /> Domiciliar
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {app.contact?.name || 'Paciente sem nome'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-muted-foreground pl-2 mt-3 border-t pt-2 border-border/50">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3.5 w-3.5" />
                                            {app.professional_name || 'Profissional'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {app.location === 'domiciliar' ? 'Casa do Paciente' : 'Consultório'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  );
                })()}
             </div>
          ) : (
            <MonthlyCalendarView
              currentDate={currentDate}
              appointments={appointments}
              onDayClick={(date) => {
                setViewMode('day'); // Ao clicar no mês, vai para o dia
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
          onDelete={handleDeleteAppointment} // PASSANDO A FUNÇÃO DE DELETE
          initialData={dialogInitialData}
          patients={patients} // Passando a lista de pacientes carregada
        />
      </div>
    </>
  );
};

export default Appointments;