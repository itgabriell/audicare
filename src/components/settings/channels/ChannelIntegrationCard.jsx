import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings2, Power, Link, Clock } from 'lucide-react';
import ChannelConnectionStatus from './ChannelConnectionStatus';
import { cn } from '@/lib/utils';

const ChannelIntegrationCard = ({
  title,
  description,
  icon: Icon,
  status = 'disconnected',
  lastSync,
  onConnect,
  onDisconnect,
  onConfigure,
  isLoading = false,
  isComingSoon = false
}) => {
  return (
    <Card className={cn(
      "flex flex-col h-full transition-all duration-200 hover:shadow-lg border-l-4",
      status === 'connected' ? "border-l-green-500" : "border-l-transparent",
      isComingSoon && "opacity-75 grayscale-[0.5]"
    )}>
      <CardHeader className="flex-row gap-4 space-y-0 pb-4">
        <div className={cn(
          "p-3 rounded-xl h-fit border transition-colors shrink-0",
          status === 'connected' ? "bg-primary/10 border-primary/20" : "bg-secondary/50"
        )}>
          <Icon className={cn(
            "w-8 h-8",
            status === 'connected' ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <CardTitle className="text-lg font-semibold truncate">{title}</CardTitle>
            <div className="flex-shrink-0">
              {isComingSoon ? (
                 <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground bg-muted">
                    Em Breve
                 </span>
              ) : (
                <ChannelConnectionStatus status={status} />
              )}
            </div>
          </div>
          <CardDescription className="line-clamp-2 text-sm min-h-[2.5rem]">{description}</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        {status === 'connected' && lastSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
            <Clock className="w-3 h-3" />
            <span>Sincronizado: {lastSync}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-4 border-t bg-muted/10 mt-auto">
        {isComingSoon ? (
           <Button variant="ghost" size="sm" disabled className="w-full sm:w-auto cursor-not-allowed">
             Indisponível
           </Button>
        ) : status === 'connected' ? (
          <>
            <Button variant="outline" size="sm" onClick={onConfigure} disabled={isLoading} className="flex-1 sm:flex-none">
              <Settings2 className="w-4 h-4 mr-2" />
              Configurar
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1 sm:flex-none" onClick={onDisconnect} disabled={isLoading}>
              <Power className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onConnect} disabled={isLoading} className="w-full sm:w-auto">
            <Link className="w-4 h-4 mr-2" />
            Conectar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ChannelIntegrationCard;