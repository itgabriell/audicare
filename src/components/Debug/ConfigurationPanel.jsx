import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Server, Key, Activity, AlertTriangle, 
  CheckCircle2, XCircle, Download, History, RefreshCw, 
  FileJson, Eye, EyeOff, Globe, Database, Lock, Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { API_BASE_URL, API_ENDPOINTS, UAZAPI_ENDPOINTS } from '@/config/apiConfig';
import { supabase } from '@/lib/customSupabaseClient';

const ConfigurationPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('environment');
  const [configs, setConfigs] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const [endpointStatus, setEndpointStatus] = useState({});
  const { session } = useAuth();
  const { toast } = useToast();

  // Initialize Configs
  useEffect(() => {
    if (isOpen) {
      loadConfigurations();
    }
  }, [isOpen, session]);

  const addAuditLog = (action, details, status = 'success') => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details,
      status
    };
    setAuditLog(prev => [entry, ...prev]);
  };

  const loadConfigurations = () => {
    const envVars = [
      { 
        key: 'VITE_SUPABASE_URL', 
        value: import.meta.env.VITE_SUPABASE_URL, 
        category: 'Backend',
        sensitive: false,
        required: true 
      },
      { 
        key: 'VITE_SUPABASE_ANON_KEY', 
        value: import.meta.env.VITE_SUPABASE_ANON_KEY, 
        category: 'Security',
        sensitive: true,
        required: true 
      },
      {
        key: 'API_BASE_URL',
        value: API_BASE_URL,
        category: 'Integration',
        sensitive: false,
        required: true
      },
      {
        key: 'CURRENT_SESSION_USER',
        value: session?.user?.email || 'Not Authenticated',
        category: 'Auth',
        sensitive: false,
        required: true
      },
      {
        key: 'JWT_EXPIRY',
        value: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A',
        category: 'Auth',
        sensitive: false,
        required: true
      }
    ];

    setConfigs(envVars.map(c => ({
      ...c,
      isValid: validateConfig(c),
      showValue: !c.sensitive
    })));
    
    addAuditLog('Load Config', 'Loaded configuration variables');
  };

  const validateConfig = (config) => {
    if (config.required && !config.value) return false;
    if (config.key.includes('URL') && !config.value?.startsWith('http')) return false;
    return true;
  };

  const toggleVisibility = (key) => {
    setConfigs(current => current.map(c => 
      c.key === key ? { ...c, showValue: !c.showValue } : c
    ));
  };

  const runEndpointChecks = async () => {
    setIsRunningChecks(true);
    addAuditLog('Start Check', 'Initiated endpoint availability check');
    
    const endpoints = [
      { name: 'Backend API', url: API_BASE_URL },
      { name: 'UAZAPI Status', url: UAZAPI_ENDPOINTS.CHECK_STATUS },
      { name: 'WhatsApp Contacts', url: UAZAPI_ENDPOINTS.GET_CONTACTS }
    ];

    const results = {};

    for (const ep of endpoints) {
      const start = performance.now();
      try {
        const headers = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
        
        const res = await fetch(ep.url, { 
            method: 'GET', 
            headers,
            signal: AbortSignal.timeout(5000) 
        });
        
        const duration = performance.now() - start;
        results[ep.name] = {
          status: res.ok ? 'ok' : (res.status === 401 ? 'auth_error' : 'error'),
          code: res.status,
          latency: Math.round(duration),
          timestamp: new Date()
        };
      } catch (error) {
        results[ep.name] = {
          status: 'unreachable',
          error: error.message,
          latency: 0,
          timestamp: new Date()
        };
      }
    }

    setEndpointStatus(results);
    setIsRunningChecks(false);
    addAuditLog('End Check', 'Completed endpoint checks');
    
    const allOk = Object.values(results).every(r => r.status === 'ok');
    if(allOk) {
        toast({ title: "Configuração Saudável", className: "bg-green-50 text-green-900" });
    } else {
        toast({ variant: "destructive", title: "Problemas Detectados", description: "Alguns endpoints estão inacessíveis." });
    }
  };

  const exportConfig = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      configs: configs.map(({key, value, isValid}) => ({ key, value: key.includes('KEY') ? '***' : value, isValid })),
      endpointStatus
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_config_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    addAuditLog('Export', 'Configuration exported to JSON');
  };

  const getStatusColor = (status) => {
    if (status === 'ok') return 'text-green-500';
    if (status === 'auth_error') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Configurações do Sistema">
          <Settings className="h-5 w-5 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
                <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Validação de Configuração
                </DialogTitle>
                <DialogDescription className="mt-1">
                    Auditoria de variáveis de ambiente, conectividade e segurança.
                </DialogDescription>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={exportConfig}>
                    <Download className="h-4 w-4 mr-2" /> Exportar
                 </Button>
                 <Button size="sm" onClick={runEndpointChecks} disabled={isRunningChecks}>
                    {isRunningChecks ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
                    Verificar Agora
                 </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex-1 flex flex-row">
                <div className="w-48 border-r bg-muted/10 p-2 space-y-1">
                    <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
                        <TabsTrigger value="environment" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary">
                            <Globe className="h-4 w-4 mr-2" /> Ambiente
                        </TabsTrigger>
                        <TabsTrigger value="connectivity" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary">
                            <Server className="h-4 w-4 mr-2" /> Conectividade
                        </TabsTrigger>
                        <TabsTrigger value="auth" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary">
                            <Key className="h-4 w-4 mr-2" /> Autenticação
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="w-full justify-start px-3 py-2 data-[state=active]:bg-secondary">
                            <History className="h-4 w-4 mr-2" /> Auditoria
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-auto pt-4 px-2">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Status Geral</p>
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${Object.values(endpointStatus).some(s => s.status !== 'ok') ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                                <span className="text-xs font-bold">
                                    {Object.keys(endpointStatus).length === 0 ? 'Não verificado' : 
                                     Object.values(endpointStatus).some(s => s.status !== 'ok') ? 'Atenção' : 'Operacional'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-background flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <TabsContent value="environment" className="m-0 space-y-4">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                    <Database className="h-5 w-5 text-muted-foreground" /> Variáveis de Ambiente
                                </h3>
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Chave</TableHead>
                                                <TableHead>Valor</TableHead>
                                                <TableHead className="w-[100px]">Status</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {configs.map((config) => (
                                                <TableRow key={config.key}>
                                                    <TableCell className="font-mono text-xs font-medium">{config.key}</TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {config.showValue ? config.value : '••••••••••••••••'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {config.isValid ? 
                                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Válido</Badge> : 
                                                            <Badge variant="destructive">Inválido</Badge>
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {config.sensitive && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleVisibility(config.key)}>
                                                                {config.showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </TabsContent>

                            <TabsContent value="connectivity" className="m-0 space-y-4">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-muted-foreground" /> Status dos Endpoints
                                </h3>
                                
                                {Object.keys(endpointStatus).length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                                        <Server className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground mb-4">Nenhuma verificação executada ainda.</p>
                                        <Button onClick={runEndpointChecks}>Executar Diagnóstico</Button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {Object.entries(endpointStatus).map(([name, result]) => (
                                            <Card key={name} className="overflow-hidden">
                                                <div className="flex items-center p-4 gap-4">
                                                    <div className={`p-2 rounded-full bg-secondary/50 ${getStatusColor(result.status)}`}>
                                                        {result.status === 'ok' ? <CheckCircle2 className="h-5 w-5" /> : 
                                                         result.status === 'auth_error' ? <Lock className="h-5 w-5" /> : 
                                                         <XCircle className="h-5 w-5" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-semibold">{name}</h4>
                                                            <span className="text-xs text-muted-foreground font-mono">{result.latency}ms</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                            <Badge variant="secondary" className="text-[10px]">HTTP {result.code || 'ERR'}</Badge>
                                                            {result.error && <span className="text-red-500 text-xs">{result.error}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {result.status === 'ok' && (
                                                    <div className="bg-green-500/10 h-1 w-full" />
                                                )}
                                                {result.status !== 'ok' && (
                                                    <div className="bg-red-500/10 h-1 w-full" />
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="auth" className="m-0 space-y-4">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-muted-foreground" /> Sessão & Segurança
                                </h3>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Token JWT Atual</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs break-all">
                                            {session?.access_token ? (
                                                <>
                                                    <span className="text-green-400">Header:</span> {session.access_token.substring(0, 20)}...
                                                    <br /><br />
                                                    <span className="text-blue-400">Payload:</span> ...{session.access_token.substring(session.access_token.length - 30)}
                                                </>
                                            ) : 'Nenhum token ativo'}
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-secondary/20 rounded border">
                                                <label className="text-xs text-muted-foreground block">Expira em</label>
                                                <span className="font-medium">{session?.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString() : '-'}</span>
                                            </div>
                                            <div className="p-3 bg-secondary/20 rounded border">
                                                <label className="text-xs text-muted-foreground block">Tipo</label>
                                                <span className="font-medium">{session?.token_type || '-'}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="audit" className="m-0 space-y-4">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                    <Terminal className="h-5 w-5 text-muted-foreground" /> Log de Configuração
                                </h3>
                                <div className="border rounded-lg divide-y">
                                    {auditLog.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Nenhum registro ainda.</div>
                                    ) : (
                                        auditLog.map((log) => (
                                            <div key={log.id} className="p-3 text-sm flex items-start gap-3 hover:bg-muted/50">
                                                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                                <div className="flex-1">
                                                    <span className="font-medium text-foreground">{log.action}</span>
                                                    <p className="text-muted-foreground">{log.details}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </div>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigurationPanel;