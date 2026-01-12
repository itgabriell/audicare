import React, { useState, useEffect } from 'react';
import { runSupabaseHealthCheck } from '@/utils/supabaseHealthCheck';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { useToast } from "@/components/ui/use-toast";


const statusIcons = {
    pending: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    failure: <XCircle className="h-5 w-5 text-destructive" />,
};

const statusColors = {
    pending: 'border-muted',
    success: 'border-green-500/50 bg-green-500/5',
    failure: 'border-destructive/50 bg-destructive/5',
}

const HealthCheckPanel = () => {
    const { profile, loading: authLoading } = useAuth();
    const [results, setResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const { toast } = useToast();

    const performCheck = async () => {
        if (!profile?.clinic_id) {
            setResults([{ name: 'Pré-requisito', status: 'failure', details: 'Usuário não autenticado ou sem clínica associada.' }]);
            return;
        }
        setIsRunning(true);
        const checkResults = await runSupabaseHealthCheck(profile.clinic_id);
        setResults(checkResults);
        setIsRunning(false);
    };

    const handleSeedDatabase = async () => {
        // Seeding is now disabled. Show a toast message instead.
        toast({
            title: "Ação Desativada",
            description: "O preenchimento automático de dados (seed) foi desativado. Por favor, insira os dados manualmente através da aplicação.",
            variant: "default",
        });
        console.log("Attempted to seed database, but the feature is disabled.");
    };

    useEffect(() => {
        if (!authLoading && profile) {
            performCheck();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, profile]);

    return (
        <>
            <Helmet>
                <title>Health Check - Audicare</title>
                <meta name="description" content="Painel de diagnóstico da integração com o Supabase." />
            </Helmet>
            <div className="container mx-auto p-4 md:p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Painel de Diagnóstico (Health Check)</CardTitle>
                        <CardDescription>
                            Este painel verifica a saúde da sua integração com o Supabase. Use-o para diagnosticar problemas de conexão, segurança e tempo real.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {results.map((result, index) => (
                            <div key={index} className={cn("p-4 rounded-lg border flex items-start gap-4", statusColors[result.status])}>
                                <div className="mt-1">{statusIcons[result.status]}</div>
                                <div className="flex-1">
                                    <h3 className="font-semibold">{result.name}</h3>
                                    <p className="text-sm text-muted-foreground">{result.details}</p>
                                </div>
                            </div>
                        ))}
                        <div className="flex space-x-2">
                            <Button onClick={performCheck} disabled={isRunning}>
                                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isRunning ? 'Executando...' : 'Executar Novamente'}
                            </Button>
                             <Button onClick={handleSeedDatabase}>
                                Popular Dados de Teste
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default HealthCheckPanel;