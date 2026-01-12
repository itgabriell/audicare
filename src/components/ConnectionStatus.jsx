import React, { useEffect, useState } from 'react';
import { healthCheckService } from '@/services/healthCheckService';
import { Wifi, WifiOff, AlertTriangle, Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ConnectionStatus = ({ className, detailed = false }) => {
  const [status, setStatus] = useState(healthCheckService.status);
  const [latency, setLatency] = useState(healthCheckService.latency);
  const [lastCheck, setLastCheck] = useState(healthCheckService.lastCheck);

  useEffect(() => {
    const unsubscribe = healthCheckService.subscribe((state) => {
      setStatus(state.status);
      setLatency(state.latency);
      setLastCheck(state.lastCheck);
    });
    
    // Ensure polling is active
    healthCheckService.startPolling();

    return () => unsubscribe();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'degraded': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'offline': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'offline': return <WifiOff className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
     switch (status) {
      case 'online': return 'Conectado';
      case 'degraded': return 'Instável';
      case 'offline': return 'Offline';
      default: return 'Verificando...';
    }
  };

  if (detailed) {
      return (
          <div className={cn("flex items-center gap-3 p-2 rounded-lg border", getStatusColor(), className)}>
              <div className="p-2 rounded-full bg-background/50">{getIcon()}</div>
              <div className="flex flex-col">
                  <span className="font-medium text-sm">{getLabel()}</span>
                  <span className="text-xs opacity-80">
                      {latency}ms • {lastCheck ? format(lastCheck, 'HH:mm:ss') : '-'}
                  </span>
              </div>
          </div>
      );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-help select-none",
                getStatusColor(),
                className
            )}
          >
            <span className="relative flex h-2.5 w-2.5">
              {status === 'online' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              )}
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", 
                  status === 'online' ? 'bg-green-500' : 
                  status === 'degraded' ? 'bg-yellow-500' : 
                  status === 'offline' ? 'bg-red-500' : 'bg-gray-400'
              )}></span>
            </span>
            <span className="text-xs font-medium hidden sm:inline-block">
               {getLabel()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs p-3">
          <div className="font-semibold mb-1">Status do Sistema</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Estado:</span>
              <span>{getLabel()}</span>
              <span className="text-muted-foreground">Latência:</span>
              <span>{latency}ms</span>
              <span className="text-muted-foreground">Última verif.:</span>
              <span>{lastCheck ? format(lastCheck, 'HH:mm:ss') : 'Nunca'}</span>
          </div>
          {status === 'degraded' && (
              <p className="mt-2 text-yellow-600 border-t pt-2">
                  ⚠️ O backend está online, mas a instância do WhatsApp pode estar desconectada.
              </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConnectionStatus;