import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  MessageSquare,
  Calendar,
  Users,
  TestTube,
  Save,
  Play,
  Pause,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const AutomationSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    birthday: {
      enabled: false,
      message: '🎉 Feliz Aniversário! 🎂\n\nQue seu dia seja repleto de alegria e saúde! Que tal agendar uma consulta para verificar seus aparelhos?\n\nAtenciosamente,\nClínica Audicare'
    },
    appointment_confirmation: {
      enabled: false,
      daysAhead: 2,
      message: 'Olá {{nome}}! 👋\n\nLembrando que sua consulta está agendada para {{data}} às {{hora}}.\n\nPor favor, responda SIM para confirmar sua presença ou NOSSO contato para reagendar.\n\nAtenciosamente,\nClínica Audicare'
    },
    welcome_checkin: {
      enabled: false,
      message: 'Olá {{nome}}! 👋\n\nVimos que você chegou para sua consulta. Estamos preparando tudo para te atender!\n\nSe precisar de algo, é só falar.\n\nAtenciosamente,\nClínica Audicare'
    },
    goodbye_checkout: {
      enabled: false,
      message: 'Olá {{nome}}! 👋\n\nObrigado por confiar na Clínica Audicare!\n\nEsperamos te ver novamente em breve. Cuide-se bem! 💙\n\nAtenciosamente,\nClínica Audicare'
    }
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('11999999999');

  // Carregar configurações do backend
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';
      const response = await fetch(`${apiUrl}/api/automation/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as configurações das automações."
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';
      const response = await fetch(`${apiUrl}/api/automation/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso!"
        });
      } else {
        throw new Error('Erro na resposta do servidor');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações."
      });
    } finally {
      setLoading(false);
    }
  };

  const testAutomation = async (automationType) => {
    if (!testPhone) {
      toast({
        variant: "destructive",
        title: "Telefone necessário",
        description: "Digite um número de telefone para testar."
      });
      return;
    }

    try {
      setTesting(true);

      // Preparar dados de teste
      const testData = {
        patient: { name: 'João Silva', phone: testPhone },
        appointment: {
          title: 'Consulta de Rotina',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Amanhã
        }
      };

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.audicarefono.com.br';
      const response = await fetch(`${apiUrl}/api/automation/test/${automationType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: testPhone,
          data: testData
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Teste enviado!",
          description: `Mensagem de teste enviada para ${testPhone}`
        });
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  const updateSetting = (automationType, field, value) => {
    setSettings(prev => ({
      ...prev,
      [automationType]: {
        ...prev[automationType],
        [field]: value
      }
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">🤖 Automações de Engajamento</h1>
          <p className="text-muted-foreground mt-2">
            Configure mensagens automáticas para manter o contato com seus pacientes
          </p>
        </div>
        <Button onClick={saveSettings} disabled={loading} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      <Tabs defaultValue="birthday" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="birthday" className="flex items-center gap-2">
            🎂 Aniversários
          </TabsTrigger>
          <TabsTrigger value="appointment_confirmation" className="flex items-center gap-2">
            📅 Confirmações
          </TabsTrigger>
          <TabsTrigger value="welcome_checkin" className="flex items-center gap-2">
            🏥 Check-in
          </TabsTrigger>
          <TabsTrigger value="goodbye_checkout" className="flex items-center gap-2">
            👋 Check-out
          </TabsTrigger>
        </TabsList>

        {/* Aniversários */}
        <TabsContent value="birthday">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎂 Aniversários
                <Badge variant={settings.birthday.enabled ? "default" : "secondary"}>
                  {settings.birthday.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Envia mensagem de parabéns automaticamente todo dia às 9:00 para pacientes que fazem aniversário
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="birthday-enabled"
                  checked={settings.birthday.enabled}
                  onCheckedChange={(checked) => updateSetting('birthday', 'enabled', checked)}
                />
                <Label htmlFor="birthday-enabled">Habilitar automação de aniversários</Label>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Aniversário</Label>
                <Textarea
                  value={settings.birthday.message}
                  onChange={(e) => updateSetting('birthday', 'message', e.target.value)}
                  placeholder="Digite a mensagem de aniversário..."
                  rows={6}
                  disabled={!settings.birthday.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{nome}}'} para inserir o nome do paciente automaticamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmação de Consultas */}
        <TabsContent value="appointment_confirmation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📅 Confirmação de Consultas
                <Badge variant={settings.appointment_confirmation.enabled ? "default" : "secondary"}>
                  {settings.appointment_confirmation.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Envia lembretes de confirmação antes das consultas agendadas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="confirmation-enabled"
                  checked={settings.appointment_confirmation.enabled}
                  onCheckedChange={(checked) => updateSetting('appointment_confirmation', 'enabled', checked)}
                />
                <Label htmlFor="confirmation-enabled">Habilitar confirmação de consultas</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dias de antecedência</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.appointment_confirmation.daysAhead}
                    onChange={(e) => updateSetting('appointment_confirmation', 'daysAhead', parseInt(e.target.value) || 2)}
                    disabled={!settings.appointment_confirmation.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dias antes da consulta para enviar o lembrete
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Confirmação</Label>
                <Textarea
                  value={settings.appointment_confirmation.message}
                  onChange={(e) => updateSetting('appointment_confirmation', 'message', e.target.value)}
                  placeholder="Digite a mensagem de confirmação..."
                  rows={6}
                  disabled={!settings.appointment_confirmation.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders disponíveis: {'{{nome}}'}, {'{{data}}'}, {'{{hora}}'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-in */}
        <TabsContent value="welcome_checkin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏥 Check-in (Chegada)
                <Badge variant={settings.welcome_checkin.enabled ? "default" : "secondary"}>
                  {settings.welcome_checkin.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Envia mensagem de boas-vindas quando o status da consulta muda para "Chegou"
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="welcome-enabled"
                  checked={settings.welcome_checkin.enabled}
                  onCheckedChange={(checked) => updateSetting('welcome_checkin', 'enabled', checked)}
                />
                <Label htmlFor="welcome-enabled">Habilitar mensagem de boas-vindas</Label>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Boas-vindas</Label>
                <Textarea
                  value={settings.welcome_checkin.message}
                  onChange={(e) => updateSetting('welcome_checkin', 'message', e.target.value)}
                  placeholder="Digite a mensagem de boas-vindas..."
                  rows={6}
                  disabled={!settings.welcome_checkin.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{nome}}'} para inserir o nome do paciente automaticamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-out */}
        <TabsContent value="goodbye_checkout">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👋 Check-out (Saída)
                <Badge variant={settings.goodbye_checkout.enabled ? "default" : "secondary"}>
                  {settings.goodbye_checkout.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Envia mensagem de despedida quando o status da consulta muda para "Finalizado"
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="goodbye-enabled"
                  checked={settings.goodbye_checkout.enabled}
                  onCheckedChange={(checked) => updateSetting('goodbye_checkout', 'enabled', checked)}
                />
                <Label htmlFor="goodbye-enabled">Habilitar mensagem de despedida</Label>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Despedida</Label>
                <Textarea
                  value={settings.goodbye_checkout.message}
                  onChange={(e) => updateSetting('goodbye_checkout', 'message', e.target.value)}
                  placeholder="Digite a mensagem de despedida..."
                  rows={6}
                  disabled={!settings.goodbye_checkout.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{nome}}'} para inserir o nome do paciente automaticamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Seção de Teste */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste das Automações
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Teste suas configurações enviando mensagens para um número específico
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número para teste</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Ex: 11999999999"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={() => testAutomation('birthday')}
              disabled={testing || !settings.birthday.enabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-3 w-3" />
              Testar Aniversário
            </Button>

            <Button
              onClick={() => testAutomation('appointment_confirmation')}
              disabled={testing || !settings.appointment_confirmation.enabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-3 w-3" />
              Testar Confirmação
            </Button>

            <Button
              onClick={() => testAutomation('welcome_checkin')}
              disabled={testing || !settings.welcome_checkin.enabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-3 w-3" />
              Testar Check-in
            </Button>

            <Button
              onClick={() => testAutomation('goodbye_checkout')}
              disabled={testing || !settings.goodbye_checkout.enabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-3 w-3" />
              Testar Check-out
            </Button>
          </div>

          {testing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              Enviando mensagem de teste...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre Cron Jobs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">⏰ Cron Jobs Ativos</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>Aniversários:</strong> Todo dia às 9:00</li>
                <li>• <strong>Confirmações:</strong> Todo dia às 8:00</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">🎯 Triggers Automáticos</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>Check-in:</strong> Status → "arrived"</li>
                <li>• <strong>Check-out:</strong> Status → "completed"</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> As automações rodam no backend e são enviadas via Chatwoot → Bridge → WhatsApp.
              Use o painel de teste para validar suas configurações antes de ativar em produção.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationSettings;
