import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import chatwootService from '@/services/chatwootService';

/**
 * Componente para testar a integração com Chatwoot
 * Útil para desenvolvimento e debug
 */
const ChatwootTestPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('11999999999');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do sistema Audicare.');

  const handleTestSendMessage = async () => {
    if (!testPhone || !testMessage) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha telefone e mensagem" });
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 Testando envio de mensagem...');

      const result = await chatwootService.sendMessage(testPhone, testMessage);

      if (result.success) {
        toast({
          title: "Sucesso!",
          description: `Mensagem enviada via Chatwoot. ID: ${result.messageId}`
        });
        console.log('✅ Teste bem-sucedido:', result);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('❌ Erro no teste:', error);
      toast({
        variant: "destructive",
        title: "Erro no Teste",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestHealth = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testando health check...');

      const health = await chatwootService.checkHealth();

      if (health.status === 'healthy') {
        toast({
          title: "Chatwoot Online!",
          description: `Account: ${health.accountId}, Inbox: ${health.inboxId}`
        });
        console.log('✅ Health check OK:', health);
      } else {
        throw new Error(health.error || 'Health check falhou');
      }

    } catch (error) {
      console.error('❌ Health check falhou:', error);
      toast({
        variant: "destructive",
        title: "Chatwoot Offline",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">🧪 Teste Chatwoot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Telefone de Teste</Label>
          <Input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="Ex: 11999999999"
          />
        </div>

        <div className="space-y-2">
          <Label>Mensagem de Teste</Label>
          <Input
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTestSendMessage}
            disabled={loading}
            className="flex-1"
          >
            📤 Testar Envio
          </Button>

          <Button
            onClick={handleTestHealth}
            disabled={loading}
            variant="outline"
          >
            ❤️ Health Check
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          💡 Este painel é apenas para desenvolvimento.
          As mensagens serão enviadas via Chatwoot → Bridge → WhatsApp.
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatwootTestPanel;
