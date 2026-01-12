import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ChannelConnectionStatus from './ChannelConnectionStatus';
import ChannelIcon from '@/components/inbox/ChannelSelector';

const ChannelConfigCard = ({ channelType, config, onConfigure, isConnected }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <ChannelIcon channelType={channelType} className="w-10 h-10 text-muted-foreground" />
                    <div>
                        <CardTitle>{config.name}</CardTitle>
                        <CardDescription>{config.description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center">
                    <ChannelConnectionStatus isConnected={isConnected} />
                    <Button onClick={() => onConfigure(channelType)}>
                        {isConnected ? 'Gerenciar' : 'Configurar'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ChannelConfigCard;