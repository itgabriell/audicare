import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  getNotificationSettings,
  updateNotificationSettings
} from '@/database';
import { Loader2, Bell, Save, MessageSquare, Calendar, Users, CheckCheck, AlertCircle } from 'lucide-react';

const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    appointment: true,
    message: true,
    task: true,
    system: true,
    patient: true
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;

      try {
        const data = await getNotificationSettings(user.id);
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar configurações',
          description: 'Não foi possível carregar suas preferências de notificação.',
        });
      }
    };

    loadSettings();
  }, [user?.id, toast]);

  const handleToggle = (type) => {
    setSettings(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar autenticado para salvar as preferências.',
      });
      return;
    }

    setLoading(true);

    try {
      await updateNotificationSettings(user.id, settings);

      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências de notificação foram atualizadas com sucesso.',
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível atualizar as configurações. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: 'message',
      icon: MessageSquare,
      label: 'Novas Mensagens',
      description: 'Notificar quando receber novas mensagens no chat',
      color: 'text-blue-500'
    },
    {
      key: 'appointment',
      icon: Calendar,
      label: 'Agendamentos',
      description: 'Notificar sobre novos agendamentos e alterações',
      color: 'text-green-500'
    },
    {
      key: 'patient',
      icon: Users,
      label: 'Pacientes',
      description: 'Notificar sobre novos pacientes e atualizações',
      color: 'text-rose-500'
    },
    {
      key: 'task',
      icon: CheckCheck,
      label: 'Tarefas',
      description: 'Notificar sobre tarefas atribuídas e prazos',
      color: 'text-orange-500'
    },
    {
      key: 'system',
      icon: AlertCircle,
      label: 'Sistema',
      description: 'Notificar sobre alertas do sistema e manutenções',
      color: 'text-red-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Notificação
        </CardTitle>
        <CardDescription>
          Configure quais tipos de notificações você deseja receber no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tipos de Notificação
            </h3>

            {notificationTypes.map(({ key, icon: Icon, label, description, color }) => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            ))}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Sobre as notificações</p>
                <p className="text-xs text-muted-foreground">
                  As notificações aparecem no sino do sistema e na central de notificações da inbox.
                  Você pode desativar tipos específicos sem perder funcionalidades importantes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
