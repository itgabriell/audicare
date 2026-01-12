import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { webhookConfigService } from '@/services/webhookConfigService';
import { useToast } from '@/components/ui/use-toast';

const WebhookSettings = () => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('unknown'); // unknown, active, error
  const { toast } = useToast();

  useEffect(() => {
      const calculatedUrl = webhookConfigService.getWebhookUrl();
      setUrl(calculatedUrl);
  }, []);

  const copyToClipboard = () => {
      navigator.clipboard.writeText(url);
      toast({ title: "Copiado!", description: "URL do webhook copiada para a área de transferência." });
  };

  const handleTest = async () => {
      setTesting(true);
      setStatus('unknown');
      try {
          const success = await webhookConfigService.testWebhookEndpoint();
          setStatus(success ? 'active' : 'error');
          if (success) {
              toast({ 
                title: "Teste com Sucesso", 
                description: "O endpoint está acessível e funcionando corretamente.",
                className: 'bg-green-100 border-green-500',
              });
          } else {
              toast({ 
                variant: "destructive", 
                title: "Falha no Teste", 
                description: "Não foi possível contactar o endpoint. Verifique se o backend está rodando." 
              });
          }
      } catch (e) {
          console.error('Error testing webhook:', e);
          setStatus('error');
          toast({ 
            variant: "destructive", 
            title: "Erro ao testar", 
            description: e.message || "Ocorreu um erro ao testar o webhook. Tente novamente." 
          });
      } finally {
          setTesting(false);
      }
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Configuração de Webhook</CardTitle>
                        <CardDescription>Receba mensagens do WhatsApp em tempo real.</CardDescription>
                    </div>
                    {status === 'active' && <Badge className="bg-green-500">Ativo</Badge>}
                    {status === 'error' && <Badge variant="destructive">Erro</Badge>}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Endpoint URL</label>
                    <div className="flex gap-2">
                        <Input readOnly value={url} className="bg-muted font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copiar URL">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Configure esta URL no painel da UAZAPI. O webhook é recebido diretamente pelo backend na VPS.
                        Adicione o token de segurança conforme configurado no backend (header ou query param).
                    </p>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t">
                    <Button variant="secondary" onClick={handleTest} disabled={testing}>
                        {testing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Testar Conexão
                    </Button>
                    <Button variant="link" asChild>
                        <a href="https://app.uazapi.com.br/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Painel UAZAPI
                        </a>
                    </Button>
                </div>

                {status === 'error' && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-bold">Atenção</p>
                            <p>O endpoint do webhook pode estar inacessível. Verifique se:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>O backend na VPS está funcionando</li>
                                <li>O endpoint <code>/api/wa/webhook</code> está configurado</li>
                                <li>A URL está correta: <code>https://api.audicarefono.com.br/api/wa/webhook</code></li>
                            </ul>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default WebhookSettings;