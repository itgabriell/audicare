import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { Loader2 } from 'lucide-react';

const AppointmentModal = ({ isOpen, onClose, patientName, contactId, patientId }) => {
  const { toast } = useToast();
  const { createAppointment } = useAppointments();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [professional, setProfessional] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const professionals = ['Dr. João Silva', 'Dra. Maria Oliveira', 'Dr. Pedro Martins'];
  const consultationTypes = ['Primeira Consulta', 'Retorno', 'Exame Auditivo', 'Ajuste de Aparelho'];

  const validate = () => {
    const newErrors = {};
    if (!date) newErrors.date = 'Data é obrigatória.';
    if (!time) newErrors.time = 'Hora é obrigatória.';
    if (!professional) newErrors.professional = 'Profissional é obrigatório.';
    if (!consultationType) newErrors.consultationType = 'Tipo de consulta é obrigatório.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({
        variant: 'destructive',
        title: 'Campos inválidos',
        description: 'Por favor, preencha todos os campos obrigatórios.',
      });
      return;
    }

    if (!patientId) {
       toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Este contato não está associado a um paciente. Associe primeiro para agendar.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const appointmentDate = new Date(`${date}T${time}`).toISOString();
      
      await createAppointment({
          patient_id: patientId,
          appointment_date: appointmentDate,
          type: consultationType,
          notes: `Agendado via Inbox para ${patientName}. Profissional: ${professional}`,
          professional_id: null // Sending null as we only have names, not UUIDs. Notes cover it.
      });

      toast({
          title: 'Sucesso',
          description: 'Agendamento criado com sucesso!',
      });
      onClose();
      setDate('');
      setTime('');
      setProfessional('');
      setConsultationType('');
    } catch (error) {
      console.error(error);
      toast({
          variant: 'destructive',
          title: 'Erro ao agendar',
          description: error.message || 'Ocorreu um erro ao criar o agendamento.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Agendamento</DialogTitle>
          <DialogDescription>
            Agende uma nova consulta para {patientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Data
            </Label>
            <div className="col-span-3">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Hora
            </Label>
            <div className="col-span-3">
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={errors.time ? 'border-destructive' : ''}
              />
              {errors.time && <p className="text-xs text-destructive mt-1">{errors.time}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="professional" className="text-right">
              Profissional
            </Label>
            <div className="col-span-3">
              <Select value={professional} onValueChange={setProfessional}>
                <SelectTrigger className={errors.professional ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((prof) => (
                    <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.professional && <p className="text-xs text-destructive mt-1">{errors.professional}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="consultationType" className="text-right">
              Tipo
            </Label>
            <div className="col-span-3">
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger className={errors.consultationType ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {consultationTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.consultationType && <p className="text-xs text-destructive mt-1">{errors.consultationType}</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                </>
            ) : (
                'Agendar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
