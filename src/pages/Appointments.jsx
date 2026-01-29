import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, ChevronLeft, ChevronRight, Send, MessageSquare, Calendar, Loader2, MapPin, User, Home, ExternalLink } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DraggableAppointmentCalendar from '@/components/appointments/DraggableAppointmentCalendar';
import MonthlyCalendarView from '@/components/appointments/MonthlyCalendarView';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { useToast } from '@/components/ui/use-toast';
import { getPatients, updateAppointment, addAppointment, createNotification, deleteAppointment } from '@/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useAppointmentReminders } from '@/hooks/useAppointmentReminders';
import { useAppointments } from '@/hooks/useAppointments';

const Appointments = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patients, setPatients] = useState([]);

  // Hook de navegação para redirecionar ao clicar no nome
  const navigate = useNavigate();

  const {
    appointments,
    loading,
    refetch: loadAppointments,
    // deleteAppointment já vem importado do database no topo para evitar conflito de nomes, 
    // mas se estiver usando o hook useAppointments, precisamos garantir que a função delete esteja disponível.
    // Vou usar a função importada diretamente do database para garantir consistência neste arquivo.
  } = useAppointments();

  const [dialogInitialData, setDialogInitialData] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [viewMode, setViewMode] = useState('day');
  const [processingAction, setProcessingAction] = useState(null);

  const { toast } = useToast();

  const {
    getAppointmentsForReminders,
    sendBulkReminders
  } = useAppointmentReminders();

  const [searchParams, setSearchParams] = useSearchParams();
  const leadIdFromQuery = searchParams.get('leadId');

  useEffect(() => {
    const fetchPatients = async () => {
      const patientsData = await getPatients(1, 1000);
      setPatients(Array.isArray(patientsData?.data) ? patientsData.data : []);
    };
    fetchPatients();
  }, []);

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

  // --- Função para navegar para o paciente (com stopPropagation) ---
  const handleNavigateToPatient = (e, patientId) => {
    e.stopPropagation(); // Impede que o clique abra o modal de edição
    if (patientId) {
      navigate(`/patients/${patientId}`);
    } else {
      toast({ title: "Erro", description: "Paciente não vinculado.", variant: "destructive" });
    }
  };

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

        // Filtra garantindo que é do dia seguinte
        targetAppointments = targetAppointments.filter(apt =>
          new Date(apt.start_time).toDateString() === tomorrow.toDateString()
        );
        successMessage = "Mensagens de confirmação enviadas para amanhã!";
        emptyMessage = "Nenhum agendamento encontrado para amanhã.";
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

  // --- DIALOGO DE RELATÓRIO DE ENVIO EM MASSA ---
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  const handleBulkAction = async (actionType) => {
    setProcessingAction(actionType);
    try {
      let targetAppointments = [];

      if (actionType === 'confirm_tomorrow') {
        targetAppointments = await getAppointmentsForReminders({ daysAhead: 1 });
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filtra garantindo que é do dia seguinte e não enviado
        targetAppointments = targetAppointments.filter(apt =>
          new Date(apt.start_time).toDateString() === tomorrow.toDateString() &&
          !apt.reminder_sent_at
        );
      }

      if (targetAppointments.length === 0) {
        toast({ title: "Aviso", description: "Nenhum agendamento pendente encontrado para amanhã." });
        return;
      }

      const ids = targetAppointments.map(a => a.id);
      const result = await sendBulkReminders(ids);

      if (result.errors > 0) {
        // Se houver erros, mostra o relatório detalhado
        setReportData(result);
        setReportDialogOpen(true);
        loadAppointments();
        loadAppointments();
      } else {
        // Se 100% sucesso, apenas toast
        toast({
          title: "Sucesso Absoluto!",
          description: `${result.success} mensagens enviadas com sucesso.`,
          duration: 5000
        });
        loadAppointments();
      }

    } catch (error) {
      console.error("Erro na ação em massa:", error);
      toast({ variant: "destructive", title: "Erro Crítico", description: "Falha ao processar envios." });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSaveAppointment = useCallback(async (appointmentData) => {
    try {
      let savedAppointment;

      if (appointmentData.id) {
        savedAppointment = await updateAppointment(appointmentData);
      } else {
        savedAppointment = await addAppointment(appointmentData);
      }

      loadAppointments();

      try {
        const patientName = patients.find((p) => p.id === savedAppointment.contact_id || p.id === savedAppointment.patient_id)?.name || 'Paciente';
        const appointmentDate = format(new Date(savedAppointment.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

        await createNotification({
          type: 'appointment',
          title: appointmentData.id ? 'Consulta reagendada' : 'Nova consulta agendada',
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
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    }
  }, [patients, toast, loadAppointments]);

  const handleDeleteAppointment = async (id) => {
    const { success } = await deleteAppointment(id);
    if (success) {
      toast({ title: "Agendamento excluído" });
      setDialogOpen(false);
      loadAppointments(); // Recarrega a lista após excluir
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleSlotClick = useCallback((date, time) => {
    setDialogInitialData({ date, time });
    setEditingAppointment(null);
    setDialogOpen(true);
  }, []);

  // Passa a currentDate para o modal
  const handleOpenDialog = useCallback(() => {
    setDialogInitialData({ date: currentDate });
    setEditingAppointment(null);
    setDialogOpen(true);
  }, [currentDate]);

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
      // Usando updateAppointment para garantir consistência
      await updateAppointment(appointment.id, {
        start_time: newDate.toISOString()
      });

      loadAppointments();
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

      <div className="h-full flex flex-col space-y-4 overflow-hidden pr-1 relative">
        {/* Modern Floating Header & Controls */}
        <div className="flex flex-col gap-2 md:gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 md:p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                Agenda
              </h1>
              <p className="text-muted-foreground text-sm">
                Gerencie suas consultas e atendimentos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Navegação de Data */}
              <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl p-1 border border-slate-200/50 dark:border-slate-700/50">
                <Button variant="ghost" size="icon" onClick={() => changePeriod('prev')} className="h-8 w-8 rounded-xl hover:bg-white dark:hover:bg-slate-700">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center min-w-[140px] px-2 font-semibold text-sm text-slate-700 dark:text-slate-200">
                  {viewMode === 'day'
                    ? format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : viewMode === 'week'
                      ? `Semana ${format(currentDate, "dd/MM", { locale: ptBR })}`
                      : monthLabel
                  }
                </div>
                <Button variant="ghost" size="icon" onClick={() => changePeriod('next')} className="h-8 w-8 rounded-xl hover:bg-white dark:hover:bg-slate-700">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              <Button variant="outline" onClick={handleToday} className="rounded-xl h-11 border-slate-200 dark:border-slate-700">
                Hoje
              </Button>

              <Button onClick={handleOpenDialog} className="rounded-xl h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all ml-auto lg:ml-0">
                <Plus className="h-5 w-5 mr-2" />
                Nova Consulta
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full pt-1 border-t border-slate-100 dark:border-slate-800/50">
            {/* View Switcher */}
            <div className="flex bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-1">
              {['day', 'week', 'month'].map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className={`text-xs h-9 px-3 sm:px-4 rounded-lg capitalize transition-all ${viewMode === mode ? 'shadow-sm' : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                >
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>

            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('confirm_tomorrow')}
              disabled={!!processingAction}
              className="rounded-xl h-10 border-dashed border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 w-full sm:w-auto ml-auto"
            >
              {processingAction === 'confirm_tomorrow' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Send className="h-3.5 w-3.5 mr-2" />}
              Confirmar p/ Amanhã
            </Button>
          </div>
        </div>

        {/* Content Area - Flex-1 Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-1 relative">

          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Carregando agenda...</p>
            </div>
          ) : viewMode === 'week' ? (
            <div className="h-full">
              <DraggableAppointmentCalendar
                currentDate={currentDate}
                appointments={appointments}
                onSlotClick={handleSlotClick}
                onAppointmentClick={handleAppointmentClick}
                onAppointmentMove={handleAppointmentMove}
              />
            </div>
          ) : viewMode === 'day' ? (
            <div className="p-4 h-full overflow-y-auto scrollbar-hide">
              {(() => {
                const dayAppointments = appointments.filter(app => {
                  if (!app.start_time) return false;
                  const appDate = new Date(app.start_time);
                  return appDate.toDateString() === currentDate.toDateString();
                }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

                if (dayAppointments.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-60">
                      <Calendar className="h-16 w-16 stroke-1" />
                      <p className="text-lg font-medium">Agenda livre hoje</p>
                      <Button variant="outline" onClick={handleOpenDialog} className="rounded-xl">Agendar agora</Button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dayAppointments.map(app => {
                      const isDomiciliar = app.appointment_type === 'domiciliar' || app.location?.toLowerCase() === 'domiciliar';
                      const patientName = app.contact?.name || app.contact_name || 'Paciente sem nome';
                      const isConfirmed = !!app.reminder_sent_at; // Simplificando para visual

                      return (
                        <div
                          key={app.id}
                          onClick={() => handleAppointmentClick(app)}
                          className={`
                                group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer
                                ${isDomiciliar
                              ? 'bg-blue-50/80 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                              : 'bg-white dark:bg-card border-slate-100 dark:border-slate-800'
                            }
                          `}
                        >
                          {/* Accent Line */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDomiciliar ? 'bg-blue-500' : 'bg-primary'}`} />

                          <div className="flex flex-col h-full justify-between gap-3">
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
                                  {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isDomiciliar && (
                                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                    <Home className="h-3 w-3" /> DOM
                                  </span>
                                )}
                              </div>

                              <div
                                className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-2 hover:text-primary transition-colors flex items-center gap-1 group/link"
                                onClick={(e) => handleNavigateToPatient(e, app.contact_id || app.patient_id)}
                              >
                                {patientName}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity text-primary" />
                              </div>

                              {/* Appointment Type & Status Badges */}
                              <div className="flex flex-col gap-2 mt-3">
                                {/* Type Badge */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-medium">Tipo:</span>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize border border-slate-200 dark:border-slate-700">
                                    {app.appointment_type || 'Consulta'}
                                  </span>
                                </div>

                                {/* Status Indicator */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-medium">Status:</span>
                                  {app.reminder_sent_at ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 gap-1.5 border border-green-200 dark:border-green-800">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                      Confirmado / Enviado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 gap-1.5 border border-amber-200 dark:border-amber-800">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      Pendente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-slate-100 dark:border-slate-800/50">
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate max-w-[80px]">{app.professional_name || 'Prof.'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate">{app.location === 'domiciliar' ? 'Casa' : 'Consultório'}</span>
                              </div>
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
            <div className="h-full overflow-hidden rounded-2xl">
              <MonthlyCalendarView
                currentDate={currentDate}
                appointments={appointments}
                onDayClick={(date) => {
                  setViewMode('day');
                  setCurrentDate(date);
                }}
                onAppointmentClick={handleAppointmentClick}
              />
            </div>
          )}
        </div>

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
          onDelete={handleDeleteAppointment}
          initialData={dialogInitialData}
          patients={patients}
        />

        {/* DIALOG DE RELATÓRIO DE ENVIO */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Relatório de Envio</DialogTitle>
              <DialogDescription>
                Resumo da automação de confirmações.
              </DialogDescription>
            </DialogHeader>

            {reportData && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-muted p-4 rounded-2xl">
                  <div className="text-center w-1/2 border-r border-border">
                    <p className="text-sm text-muted-foreground">Sucesso</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.success}</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p className="text-sm text-muted-foreground">Falhas</p>
                    <p className={`text-2xl font-bold ${reportData.errors > 0 ? 'text-red-600' : 'text-foreground'}`}>
                      {reportData.errors}
                    </p>
                  </div>
                </div>

                {reportData.failures?.length > 0 && (
                  <div className="border rounded-xl max-h-[200px] overflow-y-auto bg-red-50/50">
                    <div className="bg-red-100/50 p-2 text-xs font-semibold text-red-700 sticky top-0 backdrop-blur-sm">
                      Falhas ({reportData.failures.length})
                    </div>
                    <ul className="divide-y divide-red-100 text-sm">
                      {reportData.failures.map((fail, idx) => (
                        <li key={idx} className="p-3 hover:bg-red-100/30 flex flex-col">
                          <span className="font-medium">{fail.patientName}</span>
                          <span className="text-xs text-red-500 truncate" title={fail.error}>
                            {fail.error}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {reportData.successes?.length > 0 && (
                  <div className="border rounded-xl max-h-[150px] overflow-y-auto bg-green-50/50">
                    <div className="bg-green-100/50 p-2 text-xs font-semibold text-green-700 sticky top-0 backdrop-blur-sm">
                      Enviados ({reportData.successes.length})
                    </div>
                    <ul className="divide-y divide-green-100 text-sm">
                      {reportData.successes.map((item, idx) => (
                        <li key={idx} className="p-2 text-muted-foreground px-4">
                          {item.patientName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setReportDialogOpen(false)} className="rounded-xl w-full">Fechar Relatório</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Appointments;