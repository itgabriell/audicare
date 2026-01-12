import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SyncStatus = ({ status, lastSync, isOnline }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "h-2 w-2 rounded-full",
        status === 'connected' ? "bg-green-500" : 
        status === 'error' ? "bg-red-500" : "bg-yellow-500"
      )} />
      <div className="flex flex-col">
        <span className="text-xs font-medium leading-none">
          {status === 'connected' ? 'Sincronizado' : 'Desconectado'}
        </span>
        {lastSync && (
          <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
            {format(new Date(lastSync), 'HH:mm')}
          </span>
        )}
      </div>
    </div>
  );
};

export default SyncStatus;