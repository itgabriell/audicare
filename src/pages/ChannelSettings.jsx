import React from 'react';
import { Helmet } from 'react-helmet';
import { MessageCircle, Facebook, Instagram, Linkedin, Smartphone, Mail } from 'lucide-react';
import ChannelIntegrationGrid from '@/components/settings/channels/ChannelIntegrationGrid';
import { useToast } from '@/components/ui/use-toast';

const ChannelSettings = () => {
  const { toast } = useToast();

  const handleAction = (action, channel) => {
    if (action === 'connect') {
        toast({
            title: "Conectando...",
            description: `Iniciando processo de conexão com ${channel.title}.`,
        });
    } else if (action === 'disconnect') {
        toast({
            title: "Desconectando",
            description: `Você desconectou ${channel.title}.`,
            variant: "destructive"
        });
    } else if (action === 'configure') {
        toast({
            title: "Configurações",
            description: `Abrindo painel de configurações para ${channel.title}.`,
        });
    }
  };

  const activeChannels = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Cloud API',
      description: 'Integração oficial da Meta. Envie mensagens, automações e campanhas em escala com segurança.',
      icon: Smartphone, 
      status: 'connected',
      lastSync: 'Há 5 minutos',
    },
    {
      id: 'facebook',
      title: 'Facebook Messenger',
      description: 'Gerencie mensagens da sua página do Facebook diretamente no inbox unificado.',
      icon: Facebook,
      status: 'disconnected',
    },
    {
      id: 'instagram',
      title: 'Instagram Direct',
      description: 'Responda DMs, comentários e stories do Instagram em um só lugar.',
      icon: Instagram,
      status: 'disconnected',
    }
  ];

  const comingSoonChannels = [
    {
        id: 'linkedin',
        title: 'LinkedIn',
        description: 'Gerencie mensagens e interações profissionais da sua Company Page.',
        icon: Linkedin,
    },
    {
        id: 'email',
        title: 'Email Marketing',
        description: 'Integração com provedores de email para campanhas e notificações transacionais.',
        icon: Mail,
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Helmet>
        <title>Canais de Comunicação - Audicare</title>
      </Helmet>
      
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold tracking-tight">Canais de Comunicação</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie suas integrações com redes sociais e aplicativos de mensagem para unificar seu atendimento.
        </p>
      </div>

      <ChannelIntegrationGrid 
        channels={activeChannels} 
        comingSoonChannels={comingSoonChannels}
        onAction={handleAction}
      />
    </div>
  );
};

export default ChannelSettings;