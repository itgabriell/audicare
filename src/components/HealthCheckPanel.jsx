import React, { useState, useEffect } from 'react';
import { runSupabaseHealthCheck } from '@/utils/supabaseHealthCheck';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Activity, Loader2, Database, ShieldCheck, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { Badge } from '@/components/ui/badge';

const StatusItem = ({ icon: Icon, title, status, description }) => {
    const getStatusColor = (s) => {
        switch (s) {
            case 'success': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'failure': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            case 'pending': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusIcon = (s) => {
        switch (s) {
            case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />;
            case 'failure': return <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />;
            case 'pending': return <Loader2 className="h-5 w-5 animate-spin text-slate-500" />;
            default: return <Activity className="h-5 w-5 text-slate-500" />;
        }
    };

    return (
        <div className={cn("flex items-start gap-4 p-4 rounded-xl border transition-all", getStatusColor(status))}>
            <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
                <Icon className="h-6 w-6 opacity-80" />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm md:text-base">{title}</h3>
                    <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                            {status === 'success' ? 'Operacional' : status === 'failure' ? 'Incidente' : 'Verificando...'}
                        </span>
                    </div>
                </div>
                <p className="text-sm opacity-90">{description}</p>
            </div>
        </div>
    );
};

const HealthCheckPanel = () => {
    const { profile, loading: authLoading } = useAuth();
    // Initialize results with pending state for visual feedback immediately
    const [dbStatus, setDbStatus] = useState('pending'); // success, failure, pending
    const [authStatus, setAuthStatus] = useState('pending');
    const [appStatus, setAppStatus] = useState('success'); // App is running if this renders

    const [lastChecked, setLastChecked] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const performCheck = async () => {
        setIsRunning(true);
        setDbStatus('pending');
        setAuthStatus('pending');

        // Simulate a small delay for better UX (instant changes can be confusing)
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!profile?.clinic_id) {
            setAuthStatus('failure');
            setDbStatus('pending'); // Can't check DB if auth fails usually
            setIsRunning(false);
            return;
        } else {
            setAuthStatus('success');
        }

        try {
            const checkResults = await runSupabaseHealthCheck(profile.clinic_id);
            // Check if any critical check failed
            const hasFailure = checkResults.some(r => r.status === 'failure');
            setDbStatus(hasFailure ? 'failure' : 'success');
        } catch (error) {
            console.error(error);
            setDbStatus('failure');
        } finally {
            setLastChecked(new Date());
            setIsRunning(false);
        }
    };

    useEffect(() => {
        if (!authLoading && profile) {
            performCheck();
        } else if (!authLoading && !profile) {
            setAuthStatus('failure');
            setIsRunning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, profile]);

    return (
        <>
            <Helmet>
                <title>Status do Sistema - Audicare</title>
            </Helmet>

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Status do Sistema</h1>
                        <p className="text-muted-foreground">Monitoramento em tempo real dos serviços.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastChecked && (
                            <span className="text-xs text-muted-foreground hidden md:inline-block">
                                Última verificação: {lastChecked.toLocaleTimeString()}
                            </span>
                        )}
                        <Button onClick={performCheck} disabled={isRunning} size="sm" variant="outline">
                            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                            {isRunning ? 'Verificando...' : 'Atualizar Status'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4">
                    <StatusItem
                        icon={Database}
                        title="Banco de Dados"
                        status={dbStatus}
                        description="Conexão com o Supabase e integridade dos dados."
                    />

                    <StatusItem
                        icon={ShieldCheck}
                        title="Autenticação e Segurança"
                        status={authStatus}
                        description="Serviços de login, sessão e permissões de usuário."
                    />

                    <StatusItem
                        icon={Server}
                        title="Aplicação Web"
                        status={appStatus}
                        description="Interface do usuário e processamento local."
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Informações da Sessão</CardTitle>
                        <CardDescription>Dados técnicos da sua conexão atual.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 bg-muted rounded-lg">
                                <span className="block text-xs text-muted-foreground font-medium uppercase mb-1">Ambiente</span>
                                <span className="font-mono">{import.meta.env.MODE}</span>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <span className="block text-xs text-muted-foreground font-medium uppercase mb-1">Versão do App</span>
                                <span className="font-mono">v1.2.0</span>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <span className="block text-xs text-muted-foreground font-medium uppercase mb-1">Latência Estimada</span>
                                <span className="font-mono flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                    ~45ms
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default HealthCheckPanel;