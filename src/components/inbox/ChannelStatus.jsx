import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CHANNELS, getChannelConfig } from '@/lib/channels';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

/**
 * @typedef {'connected' | 'disconnected' | 'pending'} ConnectionStatus
 */

const statusConfig = {
    connected: { icon: CheckCircle2, color: 'text-green-500', label: 'Conectado' },
    disconnected: { icon: XCircle, color: 'text-destructive', label: 'Desconectado' },
    pending: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Pendente' },
};

/**
 * Displays the connection status for all available channels.
 * @param {object} props - The component props.
 * @param {Record<import('@/lib/channels').ChannelType, ConnectionStatus>} props.statuses - A map of channel statuses.
 */
const ChannelStatus = ({ statuses }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Status dos Canais</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {CHANNELS.map((channel) => {
                        const channelConfig = getChannelConfig(channel);
                        const status = statuses[channel] || 'disconnected';
                        const { icon: StatusIcon, color: statusColor, label } = statusConfig[status];

                        return (
                            <div key={channel} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <channelConfig.icon className={cn("h-6 w-6", channelConfig.color)} />
                                    <span className="font-medium">{channelConfig.name}</span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className="flex items-center gap-2">
                                            <StatusIcon className={cn("h-5 w-5", statusColor)} />
                                            <span className={cn("text-sm font-semibold", statusColor)}>{label}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Status da conexão: {label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default ChannelStatus;