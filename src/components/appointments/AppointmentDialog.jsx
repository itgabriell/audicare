import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Calendar, MapPin, User, FileText } from 'lucide-react';
import PatientCombobox from '@/components/patients/PatientCombobox';
import { useToast } from '@/components/ui/use-toast';

const AppointmentDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  onDelete, 
  appointment, 
  initialData,
  patients = [],
  onPatientsUpdate
}) => {
  const { register, handleSubmit, control, reset } = useForm({
    defaultValues: {
      patient_id: '',
      title: '',
      start_time: '',
      type: 'avaliacao',
      status: 'scheduled',
      notes: '',
      location: 'consultorio',
      professional_name: '' 
    }
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (appointment) {
        // --- EDIÇÃO ---
        const start = appointment.start_time ? new Date(appointment.start_time).toISOString().slice(0, 16) : '';
        
        reset({
          patient_id: appointment.contact_id || appointment.patient_id || '',
          title: appointment.title || '',
          start_time: start,
          // Mapeia do banco (appointment_type) para o form (type)
          type: appointment.appointment_type || appointment.type || 'avaliacao',
          status: appointment.status || 'scheduled',
          notes: appointment.notes || '',
          location: appointment.location || 'consultorio',
          professional_name: appointment.professional_name || ''
        });
      } else if (initialData) {
        // --- NOVO (Do Calendário) ---
        const date = initialData.date || new Date();
        const start = new Date(date);
        
        if (initialData.time) {
            const [hours, minutes] = initialData.time.split(':');
            start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else if (initialData.date && !initialData.time) {
             const now = new Date();
             start.setHours(now.getHours() + 1, 0, 0, 0);
        }

        reset({
          patient_id: initialData.leadId || '',
          title: '',
          start_time: start.toISOString().slice(0, 16),
          type: 'avaliacao',
          status: 'scheduled',
          notes: '',
          location: 'consultorio',
          professional_name: ''
        });
      } else {
        // --- NOVO (Botão Genérico) ---
        const start = new Date();
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() + 1);

        reset({
          patient_id: '',
          title: '',
          start_time: start.toISOString().slice(0, 16),
          type: 'avaliacao',
          status: 'scheduled',
          notes: '',
          location: 'consultorio',
          professional_name: ''
        });
      }
    }
  }, [appointment, initialData, open, reset]);

  const onSubmit = (data) => {
    // 1. Calcula Horário Final
    const startTime = new Date(data.start_time);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    // 2. Prepara o payload CORRETO para o banco
    const payload = {
        ...data,
        appointment_type: data.type, // Mapeia 'type' -> 'appointment_type'
        end_time: endTime.toISOString(),
        id: appointment?.id
    };

    // Remove a chave 'type' antiga para não dar erro no banco
    delete payload.type;

    onSave(payload);
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
        onDelete(appointment.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="pb-2 border-b mb-4">
          <DialogTitle className="text-xl font-semibold">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          
          {/* 1. PACIENTE */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-primary font-medium">
                <User className="w-4 h-4" /> 
                Paciente
            </Label>
            <Controller
              name="patient_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <PatientCombobox 
                  patients={patients} 
                  value={field.value} 
                  onChange={field.onChange} 
                  onPatientsUpdate={onPatientsUpdate}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 2. DATA E HORA */}
            <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Data e Hora
                </Label>
                <Input 
                    type="datetime-local" 
                    {...register('start_time', { required: true })} 
                    className="font-medium"
                />
            </div>

            {/* 3. TIPO */}
            <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avaliacao">Avaliação</SelectItem>
                        <SelectItem value="exame">Exame</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                        <SelectItem value="retorno_teste">Retorno de Teste</SelectItem>
                        <SelectItem value="aparelho">Entrega Aparelho</SelectItem>
                        <SelectItem value="domiciliar">Atendimento Domiciliar</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* 4. LOCAL */}
             <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Local
                </Label>
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultorio">Consultório</SelectItem>
                        <SelectItem value="domiciliar">Domiciliar</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
            </div>

            {/* 5. STATUS */}
            <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="no_show">Não Compareceu</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
            </div>
          </div>

          {/* 6. OBSERVAÇÕES */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Observações
            </Label>
            <Textarea 
                {...register('notes')} 
                placeholder="Ex: Queixa principal, observações..." 
                className="resize-none h-20"
            />
          </div>

          {/* RODAPÉ */}
          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t mt-4">
            {appointment?.id ? (
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                </Button>
            ) : <div />}

            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
                </Button>
                <Button type="submit">
                    Salvar
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;