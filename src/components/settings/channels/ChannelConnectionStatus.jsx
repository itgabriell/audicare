import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * @typedef {'connected' | 'disconnected' | 'pending' | 'loading'} ConnectionStatusType
 */

const statusConfig = {
    connected: { 
        icon: CheckCircle2, 
        className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        iconColor: 'text-green-600 dark:text-green-400',
        label: 'Conectado' 
    },
    disconnected: { 
        icon: XCircle, 
        className: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        iconColor: 'text-slate-500 dark:text-slate-400',
        label: 'Desconectado' 
    },
    pending: { 
        icon: AlertTriangle, 
        className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        iconColor: 'text-amber-600 dark:text-amber-400',
        label: 'Pendente' 
    },
    loading: { 
        icon: Loader2, 
        className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-400',
        label: 'Verificando...' 
    },
};

/**
 * Displays the connection status of a channel.
 * @param {object} props
 * @param {ConnectionStatusType} props.status - The connection status.
 */
const ChannelConnectionStatus = ({ status }) => {
    const config = statusConfig[status] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
        <Badge variant="outline" className={cn("flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 text-xs font-medium transition-colors", config.className)}>
            <Icon className={cn("h-3.5 w-3.5", config.iconColor, status === 'loading' && 'animate-spin')} />
            <span>{config.label}</span>
        </Badge>
    );
};

export default ChannelConnectionStatus;