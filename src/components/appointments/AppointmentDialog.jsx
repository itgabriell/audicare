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
import { Switch } from '@/components/ui/switch'; // Se usar switch para domiciliar
import PatientCombobox from '@/components/patients/PatientCombobox';
import { useToast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react'; // Ícone de lixeira

const AppointmentDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  onDelete, // Nova prop para função de deletar
  appointment, 
  patients = [],
  teamMembers = []
}) => {
  const { register, handleSubmit, control, reset, setValue, watch } = useForm({
    defaultValues: {
      patient_id: '',
      title: '',
      start_time: '',
      end_time: '',
      type: 'consulta', // consulta, retorno, exame, domiciliar
      status: 'scheduled',
      notes: '',
      professional_id: '',
      location: 'consultorio' // consultorio, domiciliar
    }
  });

  const { toast } = useToast();

  useEffect(() => {
    if (appointment) {
      // Formata as datas para o input datetime-local
      const start = appointment.start ? new Date(appointment.start).toISOString().slice(0, 16) : '';
      const end = appointment.end ? new Date(appointment.end).toISOString().slice(0, 16) : '';
      
      reset({
        patient_id: appointment.patient_id || '',
        title: appointment.title || '',
        start_time: start,
        end_time: end,
        type: appointment.type || 'consulta',
        status: appointment.status || 'scheduled',
        notes: appointment.description || '', // FullCalendar usa description, banco usa notes
        professional_id: appointment.resourceId || '', // FullCalendar usa resourceId
        location: appointment.location || 'consultorio'
      });
    } else {
      reset({
        patient_id: '',
        title: '',
        start_time: '',
        end_time: '',
        type: 'consulta',
        status: 'scheduled',
        notes: '',
        professional_id: '',
        location: 'consultorio'
      });
    }
  }, [appointment, reset, open]);

  const onSubmit = (data) => {
    onSave({
      ...data,
      id: appointment?.id // Passa o ID se for edição
    });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        onDelete(appointment.id);
        onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          
          {/* Paciente */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Controller
              name="patient_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <PatientCombobox 
                  patients={patients} 
                  value={field.value} 
                  onChange={field.onChange} 
                />
              )}
            />
          </div>

          {/* Tipo e Local */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consulta">Consulta</SelectItem>
                        <SelectItem value="exame">Exame</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                        <SelectItem value="aparelho">Entrega Aparelho</SelectItem>
                        <SelectItem value="domiciliar">Domiciliar</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
            </div>
            
            <div className="space-y-2">
                <Label>Local</Label>
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
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="datetime-local" {...register('start_time', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="datetime-local" {...register('end_time', { required: true })} />
            </div>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Controller
              name="professional_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea {...register('notes')} placeholder="Detalhes adicionais..." />
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            {/* Botão de Excluir (Só aparece se for edição) */}
            {appointment?.id ? (
                <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    className="gap-2"
                >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                </Button>
            ) : (
                <div></div> // Div vazio para manter o layout flex space-between
            )}

            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;