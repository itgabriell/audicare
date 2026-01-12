import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const leadStatuses = {
  'Novo': 'bg-blue-500',
  'Em atendimento': 'bg-yellow-500',
  'Agendado': 'bg-purple-500',
  'Em tratamento': 'bg-green-500',
  'Perdido': 'bg-red-500',
};

const LeadStatusSection = ({ currentStatus, onChangeStage }) => {
  const statusColor = leadStatuses[currentStatus] || 'bg-gray-500';

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Status do Lead
      </p>
      <Select value={currentStatus} onValueChange={onChangeStage}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', statusColor)} />
              <span>{currentStatus}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.keys(leadStatuses).map((status) => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', leadStatuses[status])} />
                <span>{status}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LeadStatusSection;