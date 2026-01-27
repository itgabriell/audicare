import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Switch } from '@/components/ui/switch';
import { Bot } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ClaraHeaderSwitch = () => {
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'clara_active').single();
      if (data) setIsActive(data.value);
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const toggleClara = async (val) => {
    setIsActive(val); // UI otimista
    const { error } = await supabase.from('app_settings').update({ value: val }).eq('key', 'clara_active');
    
    if (error) {
      setIsActive(!val); // Reverte
      toast({ title: "Erro", description: "Falha ao mudar status.", variant: "destructive" });
    } else {
      toast({ 
        title: val ? "Clara Ativada 🟢" : "Clara Pausada 🔴", 
        description: val ? "IA respondendo clientes." : "IA em silêncio.",
        duration: 2000
      });
    }
  };

  if (loading) return <div className="w-8 h-4 bg-gray-200 animate-pulse rounded"></div>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <Bot size={18} className={isActive ? "text-green-600 animate-pulse" : "text-gray-400"} />
            <span className={`text-xs font-semibold ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {isActive ? 'ON' : 'OFF'}
            </span>
            <Switch 
              checked={isActive} 
              onCheckedChange={toggleClara} 
              className={`scale-75 origin-right ${isActive ? 'data-[state=checked]:bg-green-500' : ''}`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isActive ? "Clara está atendendo (Automático)" : "Clara está dormindo (Manual)"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ClaraHeaderSwitch;