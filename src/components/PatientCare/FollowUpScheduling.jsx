import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const FollowUpScheduling = ({ patientId, clinicId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('Retorno');

  const handleSchedule = async () => {
    if (!date || !time) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Selecione data e hora.' });
      return;
    }

    setLoading(true);
    try {
      const appointmentDate = new Date(`${date}T${time}`);
      
      const { error } = await supabase.from('appointments').insert({
        clinic_id: clinicId,
        patient_id: patientId,
        professional_id: user.id,
        professional_name: user.user_metadata?.full_name || 'Profissional', // Fallback
        appointment_date: appointmentDate.toISOString(),
        appointment_type: type,
        status: 'scheduled',
        notes: 'Agendado via Atendimento Clínico',
        reminder_sent: false
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Retorno agendado com sucesso.' });
      setDate('');
      setTime('');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao agendar retorno.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-blue-600" />
          Agendar Retorno
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hora</Label>
            <Input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Retorno">Retorno</SelectItem>
              <SelectItem value="Exame">Exame</SelectItem>
              <SelectItem value="Terapia">Terapia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          className="w-full mt-2" 
          size="sm" 
          onClick={handleSchedule}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar Agendamento'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FollowUpScheduling;