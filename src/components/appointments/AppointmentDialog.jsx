import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { getClinicId } from '@/database';
import { MessageCircle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PatientCombobox from '@/components/patients/PatientCombobox';
import { useAppointmentReminders } from '@/hooks/useAppointmentReminders';

const appointmentSchema = z.object({
  contact_id: z.string().min(1, "Paciente é obrigatório"),
  professional_name: z.string().min(1, "Profissional é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Hora é obrigatória"),
  type: z.string().min(1, "Tipo de agendamento é obrigatório"),
  duration: z.number().min(1, "Duração deve ser maior que 0"),
  status: z.string().default('scheduled'),
  notes: z.string().optional(),
  professional_id: z.string().optional(),
  patient_id: z.string().optional(),
});

const AppointmentDialog = ({ open, onOpenChange, appointment, onSuccess, initialData, patients = [], onPatientsUpdate }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { sendAppointmentReminder, loading: reminderLoading } = useAppointmentReminders();

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      contact_id: '',
      professional_name: '',
      date: '',
      time: '',
      type: 'consulta',
      duration: 30,
      status: 'scheduled',
      notes: '',
    }
  });

  useEffect(() => {
    if (appointment) {
      // Para edição: usar o contact.id do objeto appointment (vem do getAppointments)
      const patientId = appointment.contact?.id || appointment.contact_id || appointment.patient_id;

      // CORREÇÃO DE MAPEAMENTO: Converta a data UTC do banco para Local corretamente
      const dbDate = new Date(appointment.appointment_date || appointment.start_time);
      const dateStr = dbDate.toLocaleDateString('sv'); // YYYY-MM-DD
      const timeStr = dbDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      form.reset({
        contact_id: patientId,
        professional_name: appointment.professional_name || 'Dra. Karine Brandão',
        date: dateStr,
        time: timeStr,
        type: appointment.appointment_type || 'consulta',
        duration: appointment.duration || 30,
        notes: appointment.notes || appointment.obs || '',
        status: appointment.status || 'scheduled',
      });
      // Fetch patient details for the "Send Message" button context
      if (patientId) {
          fetchPatient(patientId);
      }
    } else if (initialData) {
      // Auto-preencher data/hora baseado no slot clicado
      let dateValue = '';
      let timeValue = '';
      if (initialData.date && initialData.time) {
        // Se clicou em um slot específico (data + hora)
        const dateTime = new Date(initialData.date);
        const [hours, minutes] = initialData.time.split(':');
        dateTime.setHours(parseInt(hours), parseInt(minutes || 0), 0, 0);
        dateValue = dateTime.toLocaleDateString('sv');
        timeValue = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (initialData.date) {
        // Se clicou apenas em um dia (sem hora específica)
        const dateTime = new Date(initialData.date);
        dateTime.setHours(9, 0, 0, 0); // Padrão: 9:00 da manhã
        dateValue = dateTime.toLocaleDateString('sv');
        timeValue = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }

      form.reset({
        contact_id: initialData.contact_id || '',
        professional_name: 'Dra. Karine Brandão',
        date: dateValue,
        time: timeValue,
        type: initialData.appointment_type || 'consulta',
        duration: 30,
        notes: initialData.obs || '',
        status: 'scheduled',
      });
      if (initialData.contact_id) {
        fetchPatient(initialData.contact_id);
      }
    } else {
      form.reset({
        contact_id: '',
        professional_name: 'Dra. Karine Brandão',
        date: '',
        time: '',
        type: 'consulta',
        duration: 30,
        notes: '',
        status: 'scheduled',
      });
      setSelectedPatient(null);
    }
  }, [appointment, initialData, open]);

  const fetchPatient = async (id) => {
      if (!id) {
        setSelectedPatient(null);
        return;
      }

      try {
        // Primeiro tenta buscar como contact_id (tabela contacts)
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select('id, name, phone')
          .eq('id', id)
          .maybeSingle();

        if (contactData && !contactError) {
          setSelectedPatient({ ...contactData, source: 'contacts' });
          return;
        }

        // Se não encontrou em contacts, tenta patients como fallback
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id, name, phone')
          .eq('id', id)
          .maybeSingle();

        if (patientData && !patientError) {
          setSelectedPatient({ ...patientData, source: 'patients' });
          return;
        }

        // Se chegou aqui, não encontrou em nenhuma tabela
        console.warn('[AppointmentDialog] Patient/contact not found:', id);
        setSelectedPatient(null);

      } catch (error) {
        // Trata erros silenciosamente para não travar a UI
        console.warn('[AppointmentDialog] Error fetching patient data (continuing without data):', error.message);
        setSelectedPatient(null);
      }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const clinicId = await getClinicId();

      if (!clinicId) throw new Error("Clínica não identificada");

      // Determinar patient_id e contact_id baseado na origem do paciente selecionado
      let patientId = null;
      let contactId = data.contact_id;

      // Se o paciente foi encontrado na tabela patients, usar patient_id
      if (selectedPatient?.source === 'patients') {
        patientId = selectedPatient.id;
        contactId = null; // Não usar contact_id quando temos patient_id
      } else if (selectedPatient?.source === 'contacts') {
        // Se veio de contacts, manter contact_id e deixar patient_id null
        contactId = selectedPatient.id;
        patientId = null;
      }

      // CORREÇÃO DE MAPEAMENTO DE SALVAMENTO: Use os nomes exatos das colunas
      // Combinar data e hora preservando o fuso local
      const localDate = new Date(`${data.date}T${data.time}`);
      const startTimeUTC = localDate.toISOString();
      const endTimeUTC = new Date(localDate.getTime() + data.duration * 60 * 1000).toISOString();

      // PAYLOAD FINAL conforme solicitado
      const payload = {
        clinic_id: clinicId,
        appointment_date: startTimeUTC, // Manda UTC
        appointment_type: data.type, // Grava na coluna appointment_type
        duration: parseInt(data.duration), // Grava na coluna duration
        notes: data.notes, // Grava na coluna notes
        obs: data.notes, // Grava também em obs por redundância/compatibilidade
        status: data.status,
        professional_name: data.professional_name,
        professional_id: null, // Por enquanto null - aguardando implementação de select de profissionais com IDs
        patient_id: patientId,           // ID do paciente da tabela patients (UUID)
        contact_id: contactId,           // Mantém para retrocompatibilidade (UUID ou null)
        // scheduled_by: NÃO ENVIAR - o trigger resolve automaticamente
      };

      console.log('[AppointmentDialog] Payload final para banco:', payload);

      let error;
      if (appointment?.id) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', appointment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('appointments')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: "Sucesso", description: "Agendamento salvo com sucesso." });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('[AppointmentDialog] Erro ao salvar:', error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar agendamento." });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
      // Usar telefone principal ou primeiro disponível com WhatsApp
      const primaryPhone = selectedPatient?.phones?.find(p => p.is_primary && p.is_whatsapp) 
        || selectedPatient?.phones?.find(p => p.is_whatsapp)
        || selectedPatient?.phones?.find(p => p.is_primary)
        || selectedPatient?.phones?.[0];
      
      const phoneToUse = primaryPhone?.phone || selectedPatient?.phone;
      
      if (phoneToUse) {
          const phone = phoneToUse.replace(/\D/g, '');
          navigate(`/inbox?phone=${phone}`);
      } else {
          toast({ variant: "destructive", title: "Erro", description: "Paciente sem telefone cadastrado." });
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          <DialogDescription>
            {appointment ? 'Edite os detalhes do agendamento existente.' : 'Preencha os dados para criar um novo agendamento.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <PatientCombobox
                patients={Array.isArray(patients) ? patients : []}
                value={form.watch('contact_id')}
                onChange={(val) => {
                    form.setValue('contact_id', val);
                    fetchPatient(val);
                }}
                onPatientAdded={(newPatient) => {
                    // Atualizar lista de pacientes quando um novo for criado
                    if (onPatientsUpdate) {
                        onPatientsUpdate([...patients, newPatient]);
                    }
                }}
                disabled={!!appointment}
            />
            {appointment && selectedPatient && (
                <Button 
                    type="button" 
                    variant="link" 
                    className="h-auto p-0 text-xs text-blue-600 flex items-center gap-1"
                    onClick={handleSendMessage}
                >
                    <MessageCircle className="h-3 w-3" />
                    Enviar mensagem para {selectedPatient.name}
                </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Data</Label>
                <Input
                    type="date"
                    {...form.register('date')}
                />
                {form.formState.errors.date && (
                    <span className="text-xs text-red-500">{form.formState.errors.date.message}</span>
                )}
            </div>
            <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                    type="time"
                    {...form.register('time')}
                />
                {form.formState.errors.time && (
                    <span className="text-xs text-red-500">{form.formState.errors.time.message}</span>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input
                    type="number"
                    {...form.register('duration', { valueAsNumber: true })}
                    placeholder="30"
                />
                {form.formState.errors.duration && (
                    <span className="text-xs text-red-500">{form.formState.errors.duration.message}</span>
                )}
            </div>
            <div className="space-y-2">
                <Label>Status</Label>
                <Select
                    onValueChange={(val) => form.setValue('status', val)}
                    defaultValue={form.watch('status')}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="not_confirmed">Não Confirmado</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="arrived">Paciente Chegou</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="no_show">Não Compareceu</SelectItem>
                        <SelectItem value="rescheduled">Reagendado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profissional</Label>
            <Input {...form.register('professional_name')} placeholder="Nome do médico/especialista" />
             {form.formState.errors.professional_name && (
                <span className="text-xs text-red-500">{form.formState.errors.professional_name.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Consulta</Label>
            <Select
                onValueChange={(val) => form.setValue('type', val)}
                defaultValue={form.watch('type')}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Avaliação">Avaliação</SelectItem>
                    <SelectItem value="Molde">Molde</SelectItem>
                    <SelectItem value="Retorno pós compra">Retorno pós compra</SelectItem>
                    <SelectItem value="Retorno comum">Retorno comum</SelectItem>
                    <SelectItem value="Ajuste">Ajuste</SelectItem>
                    <SelectItem value="Reparo">Reparo</SelectItem>
                </SelectContent>
            </Select>
             {form.formState.errors.type && (
                <span className="text-xs text-red-500">{form.formState.errors.type.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea {...form.register('notes')} placeholder="Detalhes adicionais..." />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              {appointment && selectedPatient && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!appointment.id) return;

                    const result = await sendAppointmentReminder(appointment.id);
                    if (result.success) {
                      toast({ title: "Sucesso", description: result.message });
                    } else if (!result.alreadySent) {
                      toast({ variant: "destructive", title: "Erro", description: result.message });
                    }
                  }}
                  disabled={reminderLoading}
                  className="flex items-center gap-1"
                >
                  <Bell className="h-3 w-3" />
                  {reminderLoading ? 'Enviando...' : 'Enviar Lembrete'}
                </Button>
              )}
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
