import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CalendarPlus, Calendar, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { chatwootService } from '@/services/chatwootService';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import DraggableAppointmentCalendar from '@/components/appointments/DraggableAppointmentCalendar';
import { getPatients, addAppointment, createNotification } from '@/database';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppointments } from '@/hooks/useAppointments';

const ChatIntegration = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [computedUrl, setComputedUrl] = useState(null);

  // States for Appointment Dialog
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [initialDialogData, setInitialDialogData] = useState(null);
  const { toast } = useToast();

  // States for Calendar View
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Use the hook for appointments data
  const { appointments, loading: loadingAppointments, refetch: loadAppointments } = useAppointments();

  // URL Base do Chatwoot
  const BASE_URL = "https://chat.audicarefono.com.br";

  // Fetch Patients for Combobox
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const patientsData = await getPatients(1, 1000);
        setPatients(Array.isArray(patientsData?.data) ? patientsData.data : []);
      } catch (error) {
        console.error("Erro ao carregar pacientes para o chat:", error);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    const resolveUrl = async () => {
      setIsLoading(true);
      try {
        const conversationId = searchParams.get('conversation_id');
        const accountId = searchParams.get('account_id') || '2';

        if (conversationId) {
          setComputedUrl(`${BASE_URL}/app/accounts/${accountId}/conversations/${conversationId}`);
          return;
        }

        const phone = searchParams.get('phone');
        const name = searchParams.get('name');
        const email = searchParams.get('email');

        if (phone) {
          const patientMock = {
            name: name || 'Visitante',
            email: email || '',
            phone: phone
          };

          try {
            const result = await chatwootService.ensureConversationForNavigation(patientMock);
            if (result && result.conversationId) {
              setComputedUrl(`${BASE_URL}/app/accounts/${result.accountId || accountId}/conversations/${result.conversationId}`);
              return;
            }
          } catch (err) {
            console.error("Falha ao resolver conversa Chatwoot:", err);
          }
        }

        setComputedUrl(`${BASE_URL}/app/accounts/${accountId}/dashboard`);

      } finally {
        setIsLoading(false);
      }
    };

    resolveUrl();
  }, [searchParams]);

  // Helper to find patient context
  const getContextPatientId = () => {
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');
    const leadId = searchParams.get('leadId');

    let preSelectedPatientId = leadId || '';

    if (!preSelectedPatientId && (name || phone)) {
      const found = patients.find(p => {
        const matchName = name && p.name.toLowerCase().includes(name.toLowerCase());
        const matchPhone = phone && p.phone && p.phone.includes(phone.replace(/\D/g, ''));
        return matchName || matchPhone;
      });
      if (found) preSelectedPatientId = found.id;
    }
    return preSelectedPatientId;
  };

  // Handle Quick Schedule Click
  const handleOpenSchedule = () => {
    setInitialDialogData({
      date: new Date(),
      time: null,
      leadId: getContextPatientId()
    });
    setIsAppointmentDialogOpen(true);
  };

  // Handle Calendar Slot Click
  const handleSlotClick = useCallback((date, time) => {
    // 1. Close Calendar
    setIsCalendarOpen(false);

    // 2. Open Appointment Dialog with selected slot
    setInitialDialogData({
      date: date,
      time: time,
      leadId: getContextPatientId() // Still try to attach patient context
    });
    setIsAppointmentDialogOpen(true);
  }, [patients, searchParams]);

  // Handle Save
  const handleSaveAppointment = async (appointmentData) => {
    try {
      const savedAppointment = await addAppointment(appointmentData);

      toast({ title: "Sucesso", description: "Agendamento criado via Inbox!" });
      setIsAppointmentDialogOpen(false);
      setInitialDialogData(null);
      loadAppointments(); // Refresh calendar data

      // Automation Trigger
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';
        const API_KEY = import.meta.env.VITE_INTERNAL_API_KEY;

        console.log("🚀 [Inbox] Disparando automação para Novo Agendamento:", savedAppointment.id);

        fetch(`${API_BASE}/api/automations/appointment-created/${savedAppointment.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          }
        })
          .then(res => {
            if (res.ok) {
              console.log("✅ [Inbox] Automação disparada com sucesso.");
              toast({ title: 'Automação Enviada', description: 'Mensagem de confirmação disparada.', className: "bg-green-50 border-green-200 text-green-800" });
            } else {
              console.warn("⚠️ [Inbox] Falha no disparo da automação:", res.status);
              toast({ title: 'Aviso', description: 'Agendamento salvo, mas falha ao enviar mensagem automática.', variant: 'destructive' });
            }
          })
          .catch(err => {
            console.error("❌ [Inbox] Erro de rede na automação:", err);
            toast({ title: 'Erro de Conexão', description: 'Não foi possível conectar ao servidor de automação.', variant: 'destructive' });
          });

      } catch (e) { console.warn("Erro ao tentar disparar automação (Inbox):", e); }

      // Internal Notification
      try {
        const patientName = patients.find((p) => p.id === savedAppointment.contact_id || p.id === savedAppointment.patient_id)?.name || 'Paciente';
        const appointmentDate = format(new Date(savedAppointment.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

        await createNotification({
          type: 'appointment',
          title: 'Nova consulta agendada (via Inbox)',
          message: `Consulta de ${patientName} para ${appointmentDate}`,
          related_entity_type: 'appointment',
          related_entity_id: savedAppointment.id,
          metadata: { appointment_id: savedAppointment.id }
        });
      } catch (e) { console.warn('Erro notificação:', e); }

    } catch (err) {
      console.error("[Inbox] Erro ao salvar agendamento:", err);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao criar agendamento." });
    }
  };

  if (!computedUrl) return null;

  return (
    <div className="flex-1 h-full w-full relative bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {searchParams.get('phone') ? 'Localizando conversa...' : 'Carregando Chat...'}
            </span>
          </div>
        </div>
      )}
      <div className="w-full h-full">
        <iframe
          key={computedUrl}
          src={computedUrl}
          className="w-full h-full border-none"
          style={{ width: '100%', height: '100%' }}
          title="Chatwoot Inbox"
          allow="camera; microphone; geolocation; keyboard-map; clipboard-read; clipboard-write"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-24 right-5 z-20 flex flex-col gap-4 items-end pointer-events-none">

        {/* Container with pointer-events-auto for actual buttons */}
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          {/* View Calendar Button */}
          <Button
            onClick={() => setIsCalendarOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg shadow-black/10 hover:scale-105 transition-transform bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-0.5"
            title="Ver Agenda / Disponibilidade"
          >
            <Calendar className="h-6 w-6" />
          </Button>

          {/* Quick Schedule Button - Larger and more prominent */}
          <Button
            onClick={handleOpenSchedule}
            className="h-16 w-16 rounded-full shadow-2xl shadow-primary/40 hover:scale-110 transition-transform bg-primary hover:bg-primary/90 text-white flex items-center justify-center border-[5px] border-white dark:border-slate-900"
            title="Agendar Consulta Rápida"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </div>
      </div>

      {/* Calendar View Modal */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-6 rounded-3xl bg-slate-50 dark:bg-slate-950">
          <div className="flex justify-between items-center mb-0">
            <div className="mb-0">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                Consultar Agenda
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Visualize e gerencie os agendamentos da semana.
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Voltar para Hoje</Button>
          </div>
          <div className="flex-1 overflow-hidden border rounded-xl bg-white dark:bg-slate-900 shadow-sm mt-4">
            <DraggableAppointmentCalendar
              currentDate={currentDate}
              appointments={appointments}
              onSlotClick={handleSlotClick}
              onAppointmentClick={() => { }}
              onDateChange={setCurrentDate} // Enable navigation
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Shared Appointment Dialog */}
      <AppointmentDialog
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        onSave={handleSaveAppointment}
        initialData={initialDialogData}
        patients={patients}
        onDelete={() => { }}
        appointment={null}
      />
    </div>
  );
};

export default ChatIntegration;