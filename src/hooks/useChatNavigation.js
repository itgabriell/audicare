import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { chatwootService } from '@/services/chatwootService';

export const useChatNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const openChat = async (patient) => {
    setLoading(true);
    try {
      if (!patient.phone) {
          toast({ variant: "destructive", title: "Erro", description: "Paciente sem telefone." });
          return;
      }

      // 1. Prepara o terreno no Chatwoot (Cria contato/conversa se não existir)
      const data = await chatwootService.ensureConversationForNavigation(patient);

      // 2. Redireciona para a página de Inbox com os parâmetros
      // Passamos o conversationId para o Inbox saber qual URL carregar no iframe
      navigate(`/inbox?conversation_id=${data.conversationId}&account_id=${data.accountId}`);
      
      toast({ title: "Abrindo chat", description: `Conversa com ${patient.name} iniciada.` });

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao conectar com Chatwoot." });
    } finally {
      setLoading(false);
    }
  };

  return { openChat, loading };
};