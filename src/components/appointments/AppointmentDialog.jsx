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
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PatientCombobox from '@/components/patients/PatientCombobox';

const appointmentSchema = z.object({
  contact_id: z.string().min(1, "Paciente é obrigatório"),
  professional_name: z.string().min(1, "Profissional é obrigatório"),
  start_time: z.string().min(1, "Data e hora são obrigatórias"),
  title: z.string().min(1, "Tipo de agendamento é obrigatório"),
  status: z.string().default('scheduled'),
  obs: z.string().optional(),
  professional_id: z.string().optional(),
  patient_id: z.string().optional(),
});

const AppointmentDialog = ({ open, onOpenChange, appointment, onSuccess, initialData, patients = [] }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      contact_id: '',
      professional_name: '',
      start_time: '',
      title: '',
      status: 'scheduled',
      obs: '',
    }
  });

  useEffect(() => {
    if (appointment) {
      // Para edição: usar o contact.id do objeto appointment (vem do getAppointments)
      const patientId = appointment.contact?.id || appointment.contact_id || appointment.patient_id;
      form.reset({
        contact_id: patientId,
        professional_name: appointment.professional_name || 'Dra. Karine Brandão',
        start_time: appointment.start_time ? new Date(appointment.start_time).toISOString().slice(0, 16) : '',
        title: appointment.title || appointment.appointment_type || '',
        status: appointment.status || 'scheduled',
        obs: appointment.obs || '',
      });
      // Fetch patient details for the "Send Message" button context
      if (patientId) {
          fetchPatient(patientId);
      }
    } else if (initialData) {
      form.reset({
        contact_id: initialData.contact_id || '',
        professional_name: 'Dra. Karine Brandão',
        start_time: initialData.start_time || '',
        title: initialData.title || initialData.appointment_type || '',
        status: 'scheduled',
        obs: initialData.obs || '',
      });
      if (initialData.contact_id) {
        fetchPatient(initialData.contact_id);
      }
    } else {
      form.reset({
        contact_id: '',
        professional_name: 'Dra. Karine Brandão',
        start_time: '',
        title: '',
        status: 'scheduled',
        obs: '',
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

      // PAYLOAD FINAL conforme solicitado
      const payload = {
        clinic_id: clinicId,
        title: data.title,
        start_time: data.start_time,
        end_time: data.start_time ? new Date(new Date(data.start_time).getTime() + 30 * 60 * 1000).toISOString() : null,
        status: data.status,
        obs: data.obs || null,
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
                <Label>Data e Hora</Label>
                <Input
                    type="datetime-local"
                    {...form.register('start_time')}
                />
                {form.formState.errors.start_time && (
                    <span className="text-xs text-red-500">{form.formState.errors.start_time.message}</span>
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
                onValueChange={(val) => form.setValue('title', val)}
                defaultValue={form.watch('title')}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Consulta Inicial">Consulta Inicial</SelectItem>
                    <SelectItem value="Retorno">Retorno</SelectItem>
                    <SelectItem value="Exame">Exame</SelectItem>
                    <SelectItem value="Procedimento">Procedimento</SelectItem>
                    <SelectItem value="Terapia">Terapia</SelectItem>
                </SelectContent>
            </Select>
             {form.formState.errors.title && (
                <span className="text-xs text-red-500">{form.formState.errors.title.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea {...form.register('obs')} placeholder="Detalhes adicionais..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
