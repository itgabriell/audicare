import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, Clock } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
];

const WorkingHoursSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // State structure: array of objects matching DB schema
  const [hours, setHours] = useState([]);

  useEffect(() => {
    const fetchHours = async () => {
      if (!profile?.clinic_id) {
        setFetching(false);
        return;
      }
      
      try {
        setFetching(true);
        const { data, error } = await supabase
          .from('clinic_hours')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .order('day_of_week');

        if (error) throw error;

        // Normalize data: ensure all 7 days exist
        const normalized = DAYS_OF_WEEK.map(day => {
          const existing = data?.find(d => d.day_of_week === day.id);
          return existing || {
            day_of_week: day.id,
            open_time: '08:00',
            close_time: '18:00',
            is_closed: day.id === 0 || day.id === 6, // Weekend default closed
          };
        });
        
        setHours(normalized);
      } catch (error) {
        console.error('Error fetching hours:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao carregar', 
          description: error.message || 'Falha ao carregar horários. Tente novamente.' 
        });
      } finally {
        setFetching(false);
      }
    };

    if (profile) {
    fetchHours();
    } else {
      setFetching(false);
    }
  }, [profile, toast]);

  const handleChange = (index, field, value) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleSave = async () => {
    if (!profile?.clinic_id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você não possui uma clínica associada. Entre em contato com o suporte.',
      });
      return;
    }
    
    setLoading(true);

    try {
      const upsertData = hours.map(h => ({
        clinic_id: profile.clinic_id,
        day_of_week: h.day_of_week,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
        is_closed: h.is_closed,
      }));

      const { error } = await supabase
        .from('clinic_hours')
        .upsert(upsertData, { onConflict: 'clinic_id,day_of_week' });

      if (error) throw error;

      toast({
        title: 'Horários atualizados',
        description: 'Seus horários de funcionamento foram salvos com sucesso.',
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error saving hours:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível atualizar os horários. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.clinic_id) {
    return (
      <Card>
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Você não possui uma clínica associada. Entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>Defina os horários de abertura e fechamento da clínica.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hours.map((day, index) => (
            <div key={day.day_of_week} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
              <div className="w-32 font-medium flex items-center gap-2">
                <Switch 
                  checked={!day.is_closed}
                  onCheckedChange={(val) => handleChange(index, 'is_closed', !val)}
                />
                <span className={day.is_closed ? 'text-muted-foreground' : ''}>
                  {DAYS_OF_WEEK[day.day_of_week].label}
                </span>
              </div>

              {!day.is_closed ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={day.open_time || ''}
                    onChange={(e) => handleChange(index, 'open_time', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={day.close_time || ''}
                    onChange={(e) => handleChange(index, 'close_time', e.target.value)}
                    className="w-28"
                  />
                </div>
              ) : (
                <div className="flex-1 text-sm text-muted-foreground italic">
                  Fechado
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && <Save className="mr-2 h-4 w-4" />}
            Salvar Horários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkingHoursSettings;