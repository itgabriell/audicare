import React, { useState, useEffect } from 'react';
import { Loader2, CalendarPlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { chatwootService } from '@/services/chatwootService';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { getPatients, addAppointment, createNotification } from '@/database';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ChatIntegration = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [computedUrl, setComputedUrl] = useState(null);

  // States for Appointment Dialog
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [initialDialogData, setInitialDialogData] = useState(null);
  const { toast } = useToast();

  // URL Base do Chatwoot
  // NOTA: Idealmente, deveria vir de uma variável de ambiente, mas mantendo o padrão já existente
  const BASE_URL = "https://chat.audicarefono.com.br";

  // Fetch Patients for Combobox
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const patientsData = await getPatients(1, 1000); // Fetch enough patients
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

        // Caso 1: ID da conversa já fornecido (Link direto)
        if (conversationId) {
          setComputedUrl(`${BASE_URL}/app/accounts/${accountId}/conversations/${conversationId}`);
          return;
        }

        // Caso 2: Temos telefone? Tentar resolver a conversa
        const phone = searchParams.get('phone');
        const name = searchParams.get('name');
        const email = searchParams.get('email');

        if (phone) {
          // Simula um objeto paciente para o serviço
          const patientMock = {
            name: name || 'Visitante',
            email: email || '',
            phone: phone // O serviço já trata a limpeza
          };

          try {
            const result = await chatwootService.ensureConversationForNavigation(patientMock);
            if (result && result.conversationId) {
              setComputedUrl(`${BASE_URL}/app/accounts/${result.accountId || accountId}/conversations/${result.conversationId}`);
              return;
            }
          } catch (err) {
            console.error("Falha ao resolver conversa Chatwoot:", err);
            // Se falhar, cai no dashboard, mas loga o erro
          }
        }

        // Caso 3: Fallback para Dashboard
        setComputedUrl(`${BASE_URL}/app/accounts/${accountId}/dashboard`);

      } finally {
        setIsLoading(false);
      }
    };

    resolveUrl();
  }, [searchParams]); // Re-executa se os parâmetros mudarem

  // Handle Quick Schedule Click
  const handleOpenSchedule = () => {
    // Tenta pre-preencher com dados da URL se houver
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');
    const leadId = searchParams.get('leadId'); // Se vier de algum lugar

    // Tentar encontrar paciente pelo nome ou telefone na lista carregada
    let preSelectedPatientId = leadId || '';

    if (!preSelectedPatientId && (name || phone)) {
      const found = patients.find(p => {
        const matchName = name && p.name.toLowerCase().includes(name.toLowerCase());
        const matchPhone = phone && p.phone && p.phone.includes(phone.replace(/\D/g, ''));
        return matchName || matchPhone;
      });
      if (found) preSelectedPatientId = found.id;
    }

    setInitialDialogData({
      date: new Date(), // Hoje
      time: null,       // Próxima hora (lógica do Dialog)
      leadId: preSelectedPatientId // O Dialog usa 'leadId' ou 'patient_id' no reset logic
    });
    setIsAppointmentDialogOpen(true);
  };

  // Handle Save (Copied largely from Appointments.jsx for consistency)
  const handleSaveAppointment = async (appointmentData) => {
    try {
      // 1. Salvar no banco
      const savedAppointment = await addAppointment(appointmentData);

      toast({ title: "Sucesso", description: "Agendamento criado via Inbox!" });
      setIsAppointmentDialogOpen(false);
      setInitialDialogData(null);

      // 2. Disparar Automação (Mesma lógica do Appointments.jsx)
      // Disparar automação APENAS para novos agendamentos (aqui sempre é novo)
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

      // 3. Notificação Interna
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

  if (!computedUrl) return null; // Ou um loading spin inicial

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
          key={computedUrl} // Força re-render real quando URL muda
          src={computedUrl}
          className="w-full h-full border-none"
          style={{ width: '100%', height: '100%' }}
          title="Chatwoot Inbox"
          allow="camera; microphone; geolocation; keyboard-map; clipboard-read; clipboard-write"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Floating Action Button (FAB) for Scheduling */}
      <div className="absolute bottom-6 right-6 z-20">
        <Button
          onClick={handleOpenSchedule}
          className="h-14 w-14 rounded-full shadow-xl shadow-primary/30 hover:scale-110 transition-transform bg-primary hover:bg-primary/90 text-white flex items-center justify-center border-4 border-white dark:border-slate-900"
          title="Agendar Consulta Rápida"
        >
          <CalendarPlus className="h-6 w-6" />
        </Button>
      </div>

      {/* Shared Appointment Dialog */}
      <AppointmentDialog
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        onSave={handleSaveAppointment}
        initialData={initialDialogData}
        patients={patients}
        onDelete={() => { }} // Create-only mode implies no delete logic needed immediately
        appointment={null}  // Always new
      />
    </div>
  );
};

export default ChatIntegration;