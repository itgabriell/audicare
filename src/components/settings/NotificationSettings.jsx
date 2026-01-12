import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Bell, Save } from 'lucide-react';

const NotificationSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    email_appointments: true,
    email_marketing: false,
    browser_push: true,
    whatsapp_alerts: true
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        // Buscar preferências atualizadas do banco
        const { data, error } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences:', error);
        } else if (data?.preferences) {
          setPrefs(prev => ({ ...prev, ...data.preferences }));
        } else if (profile?.preferences) {
          // Fallback para dados do contexto
      setPrefs(prev => ({ ...prev, ...profile.preferences }));
    }
      } catch (error) {
        console.error('Error in loadPreferences:', error);
      }
    };

    loadPreferences();
  }, [user, profile]);

  const handleToggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar autenticado para salvar as preferências.',
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          preferences: prefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Preferências salvas',
        description: 'Suas configurações de notificação foram atualizadas com sucesso.',
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível atualizar as preferências. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>Escolha como e quando você deseja ser notificado.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Email</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Novos Agendamentos</Label>
                <p className="text-sm text-muted-foreground">Receber email quando um paciente agendar online.</p>
              </div>
              <Switch 
                checked={prefs.email_appointments}
                onCheckedChange={() => handleToggle('email_appointments')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing e Novidades</Label>
                <p className="text-sm text-muted-foreground">Receber dicas e novidades sobre a plataforma.</p>
              </div>
              <Switch 
                checked={prefs.email_marketing}
                onCheckedChange={() => handleToggle('email_marketing')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sistema</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações no Navegador</Label>
                <p className="text-sm text-muted-foreground">Alertas visuais enquanto utiliza o sistema.</p>
              </div>
              <Switch 
                checked={prefs.browser_push}
                onCheckedChange={() => handleToggle('browser_push')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas do WhatsApp</Label>
                <p className="text-sm text-muted-foreground">Notificar sobre falhas de conexão ou desconexão.</p>
              </div>
              <Switch 
                checked={prefs.whatsapp_alerts}
                onCheckedChange={() => handleToggle('whatsapp_alerts')}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && <Save className="mr-2 h-4 w-4" />}
            Salvar Preferências
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;