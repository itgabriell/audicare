import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Bell, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const NotificationSettings = () => {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Mock settings state - in a real app, load this from DB
    const [settings, setSettings] = useState({
        email_appointments: true,
        email_marketing: false,
        email_security: true,
        push_appointments: true,
        push_messages: true,
        push_updates: false
    });

    // Effect to simulate loading from DB/Profile
    useEffect(() => {
        // Here we would fetch current notification preferences
        // For now, we use defaults
    }, [profile]);

    const handleToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));

            // In real implementation:
            // await supabase.from('user_settings').update({ notifications: settings }).eq('user_id', profile.id);

            localStorage.setItem('audicare_notification_settings', JSON.stringify(settings));

            toast({
                title: 'Preferências salvas',
                description: 'Suas configurações de notificação foram atualizadas.',
                className: 'bg-green-100 border-green-500',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: 'Não foi possível salvar as alterações.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Notificações</h2>
                <p className="text-muted-foreground">
                    Gerencie como e quando você deseja ser notificado.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Email Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Mail className="h-5 w-5" />
                            Notificações por E-mail
                        </CardTitle>
                        <CardDescription>
                            Escolha quais emails você deseja receber.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="email_appointments" className="flex flex-col space-y-1">
                                <span>Agendamentos</span>
                                <span className="font-normal text-xs text-muted-foreground">Lembretes e confirmações de consultas.</span>
                            </Label>
                            <Switch
                                id="email_appointments"
                                checked={settings.email_appointments}
                                onCheckedChange={() => handleToggle('email_appointments')}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="email_marketing" className="flex flex-col space-y-1">
                                <span>Marketing e Novidades</span>
                                <span className="font-normal text-xs text-muted-foreground">Dicas de saúde e atualizações da clínica.</span>
                            </Label>
                            <Switch
                                id="email_marketing"
                                checked={settings.email_marketing}
                                onCheckedChange={() => handleToggle('email_marketing')}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="email_security" className="flex flex-col space-y-1">
                                <span>Segurança</span>
                                <span className="font-normal text-xs text-muted-foreground">Alertas de login e alterações de senha.</span>
                            </Label>
                            <Switch
                                id="email_security"
                                checked={settings.email_security}
                                onCheckedChange={() => handleToggle('email_security')}
                                disabled // Always on for security
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Push Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Smartphone className="h-5 w-5" />
                            Notificações Push / Navegador
                        </CardTitle>
                        <CardDescription>
                            Alertas em tempo real no seu dispositivo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="push_appointments" className="flex flex-col space-y-1">
                                <span>Lembretes de Agenda</span>
                                <span className="font-normal text-xs text-muted-foreground">Notificações antes das consultas.</span>
                            </Label>
                            <Switch
                                id="push_appointments"
                                checked={settings.push_appointments}
                                onCheckedChange={() => handleToggle('push_appointments')}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="push_messages" className="flex flex-col space-y-1">
                                <span>Mensagens</span>
                                <span className="font-normal text-xs text-muted-foreground">Novas mensagens de pacientes ou equipe.</span>
                            </Label>
                            <Switch
                                id="push_messages"
                                checked={settings.push_messages}
                                onCheckedChange={() => handleToggle('push_messages')}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default NotificationSettings;
