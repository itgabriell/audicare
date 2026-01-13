import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PatientCombobox from '@/components/patients/PatientCombobox';

const appointmentSchema = z.object({
  contact_id: z.string().min(1, "Paciente é obrigatório"),
  professional_name: z.string().min(1, "Profissional é obrigatório"),
  start_time: z.string().min(1, "Data e hora são obrigatórias"),
  appointment_type: z.string().min(1, "Tipo de agendamento é obrigatório"),
  status: z.string().default('scheduled'),
  obs: z.string().optional(),
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
      appointment_type: '',
      status: 'scheduled',
      obs: '',
    }
  });

  useEffect(() => {
    if (appointment) {
      form.reset({
        contact_id: appointment.contact_id,
        professional_name: appointment.professional_name || 'Dra. Karine Brandão',
        start_time: appointment.start_time ? new Date(appointment.start_time).toISOString().slice(0, 16) : '',
        appointment_type: appointment.appointment_type || '',
        status: appointment.status || 'scheduled',
        obs: appointment.obs || '',
      });
      // Fetch patient details for the "Send Message" button context
      if (appointment.contact_id) {
          fetchPatient(appointment.contact_id);
      }
    } else if (initialData) {
      form.reset({
        contact_id: initialData.contact_id || '',
        professional_name: 'Dra. Karine Brandão',
        start_time: initialData.start_time || '',
        appointment_type: initialData.appointment_type || '',
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
        appointment_type: '',
        status: 'scheduled',
        obs: '',
      });
      setSelectedPatient(null);
    }
  }, [appointment, initialData, open]);

  const fetchPatient = async (id) => {
      const { data } = await supabase.from('patients').select('*').eq('id', id).single();
      setSelectedPatient(data);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const clinicId = user?.user_metadata?.clinic_id;

      if (!clinicId) throw new Error("Clínica não identificada");

      const payload = {
        ...data,
        clinic_id: clinicId,
        scheduled_by: user.id,
      };

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
      console.error(error);
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
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="no_show">Não Compareceu</SelectItem>
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
                onValueChange={(val) => form.setValue('appointment_type', val)}
                defaultValue={form.watch('appointment_type')}
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
             {form.formState.errors.appointment_type && (
                <span className="text-xs text-red-500">{form.formState.errors.appointment_type.message}</span>
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
