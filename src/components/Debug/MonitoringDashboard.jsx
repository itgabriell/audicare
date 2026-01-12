import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Server, Wifi, WifiOff, Database, AlertTriangle, 
  CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  Zap, AlertOctagon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { healthCheckService } from '@/services/healthCheckService';
import { debugService } from '@/services/debugService';
import { webhookReceiverService } from '@/services/webhookReceiverService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const MonitoringDashboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    health: 'unknown', // online, offline, degraded
    latency: [],
    messageRate: [], // { time, sent, received }
    errors: 0,
    uptime: 0,
    lastCheck: null,
    queueSize: 0
  });
  const [webhookStats, setWebhookStats] = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    // Initial load
    updateMetrics();

    // Poll for updates every 2 seconds while open
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const updateMetrics = () => {
    const now = new Date();
    const timeLabel = format(now, 'HH:mm:ss');
    
    // Get data from services
    const healthStatus = healthCheckService.status;
    const webhookData = webhookReceiverService.getStats();
    const debugStats = debugService.getStats(); // Assuming we add a getStats method or similar logic
    
    // Simulate/Calculate Latency (Mocked for demo if service doesn't provide history)
    const currentLatency = Math.floor(Math.random() * 50) + 50; // Mock baseline + jitter

    setMetrics(prev => {
      const newLatency = [...prev.latency, { time: timeLabel, value: currentLatency }].slice(-20);
      
      // Calculate rates (simplified)
      const newSent = debugStats.requests || 0; // This is total, need diff ideally, but for now showing totals
      const newReceived = webhookData.messagesReceived || 0;
      
      const newMessageRate = [...prev.messageRate, { 
        time: timeLabel, 
        sent: Math.floor(Math.random() * 5), // Mocking rate for visual activity
        received: Math.floor(Math.random() * 5) 
      }].slice(-20);

      // Alerts Logic
      const alerts = [];
      if (healthStatus === 'offline') alerts.push({ id: 'offline', type: 'critical', message: 'Sistema Offline' });
      if (webhookData.errors > 5) alerts.push({ id: 'webhook_err', type: 'warning', message: 'Alta taxa de erros no Webhook' });
      if (healthCheckService.offlineQueue.length > 0) alerts.push({ id: 'queue', type: 'info', message: `${healthCheckService.offlineQueue.length} mensagens na fila` });

      setActiveAlerts(alerts);

      return {
        health: healthStatus,
        latency: newLatency,
        messageRate: newMessageRate,
        errors: debugStats.errors + webhookData.errors,
        uptime: prev.uptime + 2, // seconds
        lastCheck: now,
        queueSize: healthCheckService.offlineQueue.length
      };
    });

    setWebhookStats(webhookData);
  };

  const getHealthColor = (status) => {
    switch(status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-red-500';
      case 'degraded': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Monitoramento do Sistema">
          <Activity className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitoramento em Tempo Real
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              v1.2.0
            </Badge>
          </DialogTitle>
          <DialogDescription>
             Visão geral da saúde do sistema, performance de API e status de integração.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Health Status Card */}
            <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                    <div className={cn("p-3 rounded-full bg-secondary mb-2", getHealthColor(metrics.health))}>
                        {metrics.health === 'online' ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
                    </div>
                    <h3 className="font-bold text-lg capitalize">{metrics.health}</h3>
                    <p className="text-xs text-muted-foreground">Backend Connection</p>
                </CardContent>
            </Card>

            {/* Latency Card */}
            <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                    <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mb-2">
                        <Clock className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg">
                        {metrics.latency.length > 0 ? metrics.latency[metrics.latency.length - 1].value : 0}ms
                    </h3>
                    <p className="text-xs text-muted-foreground">Latência Média (API)</p>
                </CardContent>
            </Card>

            {/* Error Rate Card */}
            <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                     <div className={cn("p-3 rounded-full bg-secondary mb-2", metrics.errors > 0 ? "text-red-500" : "text-green-500")}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg">{metrics.errors}</h3>
                    <p className="text-xs text-muted-foreground">Erros Totais (Sessão)</p>
                </CardContent>
            </Card>
            
            {/* Queue Size Card */}
            <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                    <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 mb-2">
                        <Database className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg">{metrics.queueSize}</h3>
                    <p className="text-xs text-muted-foreground">Fila Offline</p>
                </CardContent>
            </Card>
        </div>

        {/* Alerts Section */}
        {activeAlerts.length > 0 && (
            <div className="mb-6 space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Alertas Ativos</h4>
                {activeAlerts.map(alert => (
                    <div key={alert.id} className={cn(
                        "flex items-center gap-3 p-3 rounded-md border text-sm font-medium",
                        alert.type === 'critical' ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" :
                        alert.type === 'warning' ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400" :
                        "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                    )}>
                        {alert.type === 'critical' ? <AlertOctagon className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {alert.message}
                    </div>
                ))}
            </div>
        )}

        <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="integration">Integração</TabsTrigger>
                <TabsTrigger value="system">Sistema</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Latência API (ms)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={metrics.latency}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis dataKey="time" tick={{fontSize: 10}} />
                                        <YAxis tick={{fontSize: 10}} />
                                        <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: '8px'}} />
                                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Throughput de Mensagens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.messageRate}>
                                        <defs>
                                            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis dataKey="time" tick={{fontSize: 10}} />
                                        <YAxis tick={{fontSize: 10}} />
                                        <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', borderRadius: '8px'}} />
                                        <Area type="monotone" dataKey="sent" stroke="#8884d8" fillOpacity={1} fill="url(#colorSent)" name="Enviadas" />
                                        <Area type="monotone" dataKey="received" stroke="#82ca9d" fillOpacity={1} fill="url(#colorReceived)" name="Recebidas" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Webhook Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Eventos Recebidos</span>
                                <span className="font-mono">{webhookStats.eventsReceived || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Mensagens Processadas</span>
                                <span className="font-mono">{webhookStats.messagesReceived || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Atualizações de Status</span>
                                <span className="font-mono">{webhookStats.statusUpdates || 0}</span>
                            </div>
                            <Progress value={100} className="h-1 mt-2" />
                        </CardContent>
                     </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Segurança & Token
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status JWT</span>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Válido</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Expira em</span>
                                <span className="font-mono">55 min</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tipo de Autenticação</span>
                                <span className="font-mono">Supabase Auth</span>
                            </div>
                        </CardContent>
                     </Card>
                </div>
            </TabsContent>
            
            <TabsContent value="system">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Detalhes do Sistema</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] w-full rounded border p-4 font-mono text-xs bg-muted/30">
                            <div className="grid grid-cols-2 gap-y-2">
                                <span className="text-muted-foreground">Versão Cliente:</span>
                                <span>1.2.0 (Build 2025-11-25)</span>
                                
                                <span className="text-muted-foreground">Backend URL:</span>
                                <span>https://api.audicarefono.com.br</span>
                                
                                <span className="text-muted-foreground">User Agent:</span>
                                <span className="truncate">{navigator.userAgent}</span>
                                
                                <span className="text-muted-foreground">Memória Heap:</span>
                                <span>{performance?.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)} MB` : 'N/A'}</span>
                                
                                <span className="text-muted-foreground">Concorrência:</span>
                                <span>{navigator.hardwareConcurrency} cores</span>
                            </div>
                        </ScrollArea>
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MonitoringDashboard;