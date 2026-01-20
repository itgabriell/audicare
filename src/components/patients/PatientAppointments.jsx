import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, Plus } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPatientAppointments } from '@/database';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const PatientAppointments = ({ patientId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await getPatientAppointments(patientId);
      setAppointments(data || []);
    } catch (error) {
      console.error('[PatientAppointments] Error loading appointments:', error);
      toast({
        title: 'Erro ao carregar agendamentos',
        description: 'Não foi possível carregar o histórico de agendamentos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadAppointments();
    }
  }, [patientId]);

  // Realtime subscription para atualizações automáticas
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`patient-appointments-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          console.log('[PatientAppointments] Appointment updated, reloading...');
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'arrived': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'no_show': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-400';
      case 'rescheduled': return 'bg-yellow-500';
      case 'not_confirmed': return 'bg-orange-500';
      default: return 'bg-primary';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'arrived': return 'Paciente Chegou';
      case 'completed': return 'Concluído';
      case 'no_show': return 'Não Compareceu';
      case 'cancelled': return 'Cancelado';
      case 'rescheduled': return 'Reagendado';
      case 'not_confirmed': return 'Não Confirmado';
      default: return 'Agendado';
    }
  };

  // Função segura para formatar datas
  const formatDateSafe = (dateString, pattern = "dd/MM/yyyy 'às' HH:mm") => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isValid(date) ? format(date, pattern, { locale: ptBR }) : '-';
  };

  const handleNewAppointment = () => {
    // Disparar evento para abrir o modal de novo agendamento
    window.dispatchEvent(new CustomEvent('open-appointment-dialog', {
      detail: { patientId }
    }));
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Agendamentos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''} encontrado{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleNewAppointment} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nenhum agendamento encontrado</p>
          <Button onClick={handleNewAppointment} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agendar Primeira Consulta
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {formatDateSafe(appointment.start_time)}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(appointment.status)} text-white border-0`}
                  >
                    {getStatusLabel(appointment.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{appointment.title || 'Consulta'}</span>
                  </div>

                  {appointment.professional && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {appointment.professional.name}
                      </span>
                    </div>
                  )}
                </div>

                {appointment.obs && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Observações:</strong> {appointment.obs}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Criado em {formatDateSafe(appointment.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;
