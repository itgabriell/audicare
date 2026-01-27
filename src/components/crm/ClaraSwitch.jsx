import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient'; // Verifique se o caminho do seu client está certo
import { Switch } from '@/components/ui/switch'; // Se você usa Shadcn-ui
import { Label } from '@/components/ui/label';
import { Bot, Power, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ClaraSwitch = () => {
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 1. Buscar status atual ao carregar
  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'clara_active')
        .single();

      if (data) setIsActive(data.value);
      setLoading(false);
    };

    fetchStatus();

    // (Opcional) Assinar mudanças em tempo real para sincronizar abas
    const subscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, payload => {
        if (payload.new.key === 'clara_active') {
           setIsActive(payload.new.value);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  // 2. Alternar Status
  const toggleClara = async () => {
    const newValue = !isActive;
    setIsActive(newValue); // Mudança otimista na UI

    const { error } = await supabase
      .from('app_settings')
      .update({ value: newValue })
      .eq('key', 'clara_active');

    if (error) {
      setIsActive(!newValue); // Reverte se der erro
      toast({ title: "Erro", description: "Falha ao mudar status da Clara.", variant: "destructive" });
    } else {
      toast({ 
        title: newValue ? "Clara Ativada 🟢" : "Clara Desativada 🔴", 
        description: newValue ? "A IA está respondendo os clientes." : "A IA está dormindo. Você assume." 
      });
    }
  };

  if (loading) return <div className="text-xs text-gray-500">Carregando status...</div>;

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
      
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
            {isActive ? <Bot className="h-6 w-6 animate-pulse" /> : <Power className="h-6 w-6" />}
        </div>
        <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
                Assistente Clara
                {isActive && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                )}
            </h3>
            <p className="text-xs text-gray-500">
                {isActive ? "Operando Automaticamente" : "Desligada (Modo Manual)"}
            </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
            id="clara-mode" 
            checked={isActive} 
            onCheckedChange={toggleClara}
            className={`${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
        />
      </div>
    </div>
  );
};

export default ClaraSwitch;