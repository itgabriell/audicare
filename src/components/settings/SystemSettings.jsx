import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const SystemSettings = ({ onInitializationSuccess }) => {
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [isInitialized, setIsInitialized] = useState(null); // null, true, false

    useEffect(() => {
        const checkInitialization = async () => {
            if (!authLoading && user) {
                // A user having a clinic_id is the primary sign of initialization.
                const { data: profile, error } = await supabase.from('profiles').select('clinic_id').eq('id', user.id).single();
                if(error) {
                    console.error("Error checking profile for initialization:", error);
                    setIsInitialized(false);
                    return;
                }
                
                setIsInitialized(!!profile.clinic_id);
            }
        };
        checkInitialization();
    }, [user, authLoading]);


    const handleInitialize = async () => {
        setStatus('loading');
        try {
            const { data, error, response } = await supabase.functions.invoke('initialize-system');

            // Handle Edge Function network errors
            if (error) {
                throw new Error(error.message);
            }
            
            // Handle business logic errors from the function itself
            if (!data.success) {
                // Treat "already initialized" as a success case on the frontend
                if (data.code === 'ALREADY_INITIALIZED') {
                    toast({
                        title: 'Sistema Já Inicializado',
                        description: 'Nenhuma ação foi necessária.',
                    });
                    setStatus('success');
                    setIsInitialized(true);
                     if (onInitializationSuccess) {
                        setTimeout(() => {
                            onInitializationSuccess();
                            window.location.reload(); 
                        }, 1500);
                    }
                    return;
                }
                throw new Error(data.message || 'A inicialização falhou por um motivo desconhecido.');
            }

            toast({
                title: 'Sistema Inicializado com Sucesso!',
                description: 'A clínica padrão foi criada e sua conta foi definida como administradora.',
                className: 'bg-green-100 dark:bg-green-900 border-green-300'
            });
            setStatus('success');
            setIsInitialized(true);
            
            if (onInitializationSuccess) {
                 setTimeout(() => {
                    onInitializationSuccess();
                    window.location.reload(); 
                }, 1500);
            }

        } catch (err) {
            console.error("Initialization error:", err);
            toast({
                variant: 'destructive',
                title: 'Erro na Inicialização',
                description: err.message || 'Não foi possível inicializar o sistema. Verifique o console para mais detalhes.',
            });
            setStatus('error');
        }
    };

    if (isInitialized === null) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    if (isInitialized) {
         return (
            <Card className="border-green-500 bg-green-50/50 dark:bg-green-900/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-green-600 dark:text-green-400">
                       <CheckCircle /> Sistema Inicializado
                    </CardTitle>
                    <CardDescription>
                       A configuração inicial do sistema já foi concluída. Sua clínica padrão está ativa.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <p>Sua conta está associada à clínica principal. Agora você pode prosseguir com as outras configurações, como a integração com canais de comunicação.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                    <AlertTriangle /> Ação Necessária: Inicialização do Sistema
                </CardTitle>
                <CardDescription>
                    Nenhuma clínica está vinculada à sua conta. Para usar o sistema, é preciso realizar a configuração inicial.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>
                    Ao clicar no botão abaixo, uma clínica padrão será criada e sua conta será definida como administradora principal. Isso é necessário para habilitar todas as outras funcionalidades.
                </p>
                 {status === 'error' && (
                    <p className="mt-4 text-sm text-destructive">
                        A tentativa de inicialização falhou. Verifique o console para mais detalhes e tente novamente.
                    </p>
                )}
                 {status === 'success' && (
                    <p className="mt-4 text-sm text-green-600">
                       Inicialização concluída! A página será atualizada em breve...
                    </p>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleInitialize} disabled={status === 'loading' || status === 'success'}>
                    {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {status !== 'loading' && <Rocket className="mr-2 h-4 w-4" />}
                    Inicializar Sistema
                 </Button>
            </CardFooter>
        </Card>
    );
};

export default SystemSettings;