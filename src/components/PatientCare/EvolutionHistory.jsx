import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, History } from 'lucide-react';

const EvolutionHistory = ({ patientId, refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!patientId) return;
      
      try {
        const { data, error } = await supabase
          .from('clinical_consultations')
          .select(`
            id, 
            created_at, 
            status, 
            diagnosis,
            notes,
            profiles:professional_id (full_name)
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId, refreshTrigger]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>;

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>Nenhum histórico clínico encontrado.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {history.map((item) => (
          <Card key={item.id} className="p-4 border-l-4 border-l-primary/50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-sm">
                  {format(new Date(item.created_at), "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Profissional: {item.profiles?.full_name || 'Não informado'}
                </p>
              </div>
              <Badge variant={item.status === 'finalized' ? 'default' : 'outline'}>
                {item.status === 'finalized' ? 'Finalizado' : 'Rascunho'}
              </Badge>
            </div>
            
            {item.diagnosis && (
              <div className="mb-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Diagnóstico:</span>
                <p className="text-sm mt-1">{item.diagnosis}</p>
              </div>
            )}
            
            {item.notes && (
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground">Notas:</span>
                <p className="text-sm mt-1 line-clamp-3 text-muted-foreground">{item.notes}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

export default EvolutionHistory;