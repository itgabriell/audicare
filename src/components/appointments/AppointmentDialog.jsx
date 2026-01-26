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
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import PatientCombobox from '@/components/patients/PatientCombobox'; // Componente Otimizado
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const AppointmentDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  onDelete, // Função de deletar recebida
  appointment, 
  initialData,
  patients = [],
  onPatientsUpdate
}) => {
  const { register, handleSubmit, control, reset, watch, setValue } = useForm({
    defaultValues: {
      patient_id: '',
      title: '',
      start_time: '',
      end_time: '',
      type: 'consulta',
      status: 'scheduled',
      notes: '',
      location: 'consultorio',
      professional_name: '' 
    }
  });

  const { toast } = useToast();
  const selectedType = watch('type');

  // Efeito para carregar dados (Edição ou Novo via Slot)
  useEffect(() => {
    if (open) {
      if (appointment) {
        // --- MODO EDIÇÃO ---
        const start = appointment.start_time ? new Date(appointment.start_time).toISOString().slice(0, 16) : '';
        const end = appointment.end_time ? new Date(appointment.end_time).toISOString().slice(0, 16) : '';
        
        reset({
          patient_id: appointment.contact_id || appointment.patient_id || '',
          title: appointment.title || '',
          start_time: start,
          end_time: end,
          type: appointment.appointment_type || 'consulta',
          status: appointment.status || 'scheduled',
          notes: appointment.notes || '',
          location: appointment.location || 'consultorio',
          professional_name: appointment.professional_name || ''
        });
      } else if (initialData) {
        // --- MODO NOVO (Clicou no Calendário) ---
        // Calcula horário final padrão (1h depois)
        const date = initialData.date || new Date();
        const start = new Date(date);
        if (initialData.time) {
            const [hours, minutes] = initialData.time.split(':');
            start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        reset({
          patient_id: initialData.leadId || '', // Se veio do CRM
          title: '',
          start_time: start.toISOString().slice(0, 16),
          end_time: end.toISOString().slice(0, 16),
          type: 'consulta',
          status: 'scheduled',
          notes: '',
          location: 'consultorio',
          professional_name: ''
        });
      } else {
        // --- MODO NOVO (Botão Genérico) ---
        const start = new Date();
        start.setMinutes(0, 0, 0); // Arredonda
        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        reset({
          patient_id: '',
          title: '',
          start_time: start.toISOString().slice(0, 16),
          end_time: end.toISOString().slice(0, 16),
          type: 'consulta',
          status: 'scheduled',
          notes: '',
          location: 'consultorio',
          professional_name: ''
        });
      }
    }
  }, [appointment, initialData, open, reset]);

  const onSubmit = (data) => {
    // Validação básica de horários
    if (new Date(data.end_time) <= new Date(data.start_time)) {
        toast({
            title: "Horário inválido",
            description: "O horário final deve ser maior que o inicial.",
            variant: "destructive"
        });
        return;
    }

    onSave({
      ...data,
      id: appointment?.id // Passa ID se for edição
    });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
        onDelete(appointment.id);
    }
  };

  // Cores dinâmicas para o Tipo
  const getTypeColor = (type) => {
      switch(type) {
          case 'domiciliar': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'exame': return 'bg-purple-100 text-purple-800 border-purple-200';
          case 'retorno': return 'bg-green-100 text-green-800 border-green-200';
          default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {appointment ? (
                <>
                    <span>Editar Agendamento</span>
                    <Badge variant="outline" className={`ml-2 font-normal ${getTypeColor(selectedType)}`}>
                        {selectedType}
                    </Badge>
                </>
            ) : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          
          {/* SEÇÃO 1: QUEM E ONDE */}
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paciente - COMBOBOX OTIMIZADO */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" /> 
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

                {/* Local */}
                <div className="space-y-2">
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
                            <SelectItem value="online">Online / Remoto</SelectItem>
                        </SelectContent>
                        </Select>
                    )}
                    />
                </div>
            </div>
          </div>

          {/* SEÇÃO 2: QUANDO E O QUE */}
          <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Início */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                        <Calendar className="w-3 h-3" /> Início
                    </Label>
                    <Input type="datetime-local" {...register('start_time', { required: true })} className="bg-background" />
                </div>
                
                {/* Fim */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                        <Clock className="w-3 h-3" /> Fim
                    </Label>
                    <Input type="datetime-local" {...register('end_time', { required: true })} className="bg-background" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Tipo */}
                <div className="space-y-2">
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
                            <SelectItem value="consulta">Consulta</SelectItem>
                            <SelectItem value="exame">Exame</SelectItem>
                            <SelectItem value="retorno">Retorno</SelectItem>
                            <SelectItem value="aparelho">Entrega Aparelho</SelectItem>
                            <SelectItem value="domiciliar">Atendimento Domiciliar</SelectItem>
                        </SelectContent>
                        </Select>
                    )}
                    />
                </div>

                {/* Status */}
                <div className="space-y-2">
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
          </div>

          {/* SEÇÃO 3: DETALHES */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Observações
            </Label>
            <Textarea 
                {...register('notes')} 
                placeholder="Detalhes sobre o procedimento, queixas do paciente ou preparo necessário..." 
                className="min-h-[80px]"
            />
          </div>

          {/* RODAPÉ */}
          <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-4">
            
            {/* Botão EXCLUIR (Só aparece na edição) */}
            <div className="w-full sm:w-auto">
                {appointment?.id && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleDelete}
                        className="w-full sm:w-auto gap-2 bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                    >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                    </Button>
                )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
                </Button>
                <Button type="submit" className="min-w-[100px]">
                    {appointment ? 'Salvar Alterações' : 'Agendar'}
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;