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

      <div className="space-y-6">
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

        <div className="bg-card rounded-xl shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Ações Rápidas
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleBulkAction('confirm_tomorrow')} disabled={!!processingAction} className="flex items-center gap-2">
              {processingAction === 'confirm_tomorrow' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirmar Amanhã
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
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
                      const isDomiciliar = app.appointment_type === 'domiciliar' || app.location?.toLowerCase() === 'domiciliar';
                      const patientName = app.contact?.name || app.contact_name || 'Paciente sem nome';

                      return (
                        <div
                          key={app.id}
                          onClick={() => handleAppointmentClick(app)}
                          className={`
                                        group relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all hover:shadow-md cursor-pointer
                                        ${isDomiciliar ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' : 'bg-card hover:border-primary/50'}
                                    `}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDomiciliar ? 'bg-blue-500' : 'bg-primary'}`} />

                          <div className="flex justify-between items-start mb-2 pl-2">
                            <div className="flex flex-col">
                              <span className="text-lg font-bold text-foreground flex items-center gap-2">
                                {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {isDomiciliar && (
                                  <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Home className="h-3 w-3" /> Domiciliar
                                  </span>
                                )}
                              </span>

                              {/* NOME CLICÁVEL */}
                              <div
                                className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 mt-1 w-fit z-20"
                                onClick={(e) => handleNavigateToPatient(e, app.contact_id || app.patient_id)}
                                title="Ir para ficha do paciente"
                              >
                                {patientName}
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </div>

                              {/* TIPO DA CONSULTA */}
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wide">
                                  {app.appointment_type || 'Consulta'}
                                </span>
                                {app.reminder_sent_at && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 uppercase tracking-wide gap-1" title={`Enviado em ${new Date(app.reminder_sent_at).toLocaleString('pt-BR')}`}>
                                    <Send className="h-3 w-3" /> Enviado
                                  </span>
                                )}
                              </div>

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
                setViewMode('day');
                setCurrentDate(date);
              }}
              onAppointmentClick={handleAppointmentClick}
            />
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Relatório de Envio</DialogTitle>
              <DialogDescription>
                Resumo da automação de confirmações.
              </DialogDescription>
            </DialogHeader>

            {reportData && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
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
                  <div className="border rounded-md max-h-[200px] overflow-y-auto">
                    <div className="bg-red-50 p-2 text-xs font-semibold text-red-700 sticky top-0">
                      Falhas ({reportData.failures.length})
                    </div>
                    <ul className="divide-y text-sm">
                      {reportData.failures.map((fail, idx) => (
                        <li key={idx} className="p-2 hover:bg-muted/50 flex flex-col">
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
                  <div className="border rounded-md max-h-[150px] overflow-y-auto">
                    <div className="bg-green-50 p-2 text-xs font-semibold text-green-700 sticky top-0">
                      Enviados ({reportData.successes.length})
                    </div>
                    <ul className="divide-y text-sm">
                      {reportData.successes.map((item, idx) => (
                        <li key={idx} className="p-2 text-muted-foreground">
                          {item.patientName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setReportDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Appointments;