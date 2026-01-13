import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DraggableAppointmentCalendar from '@/components/appointments/DraggableAppointmentCalendar';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { useToast } from '@/components/ui/use-toast';
import { getAppointments, addAppointment, getPatients } from '@/database';
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
  }, [patients, toast, editingAppointment]);

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

  const changeWeek = useCallback((direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
      return newDate;
    });
  }, []);

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
      // Atualizar a data/hora do agendamento no banco
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Atualizar localmente para feedback imediato
      setAppointments(prev => prev.map(app =>
        app.id === appointment.id
          ? { ...app, appointment_date: newDate.toISOString() }
          : app
      ));

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
  }, [toast, loadData]);

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

        {/* Calendário */}
        <div className="bg-card rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => changeWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {monthLabel}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => changeWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DraggableAppointmentCalendar
              currentDate={currentDate}
              appointments={appointments}
              onSlotClick={handleSlotClick}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentMove={handleAppointmentMove}
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
          patients={Array.isArray(patients) ? patients : []}
          initialData={dialogInitialData}
        />
      </div>
    </>
  );
};

export default Appointments;
