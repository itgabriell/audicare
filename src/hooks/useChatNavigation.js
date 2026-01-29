import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatwootService } from '@/services/chatwootService';
import { useToast } from '@/components/ui/use-toast';

export const useChatNavigation = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const navigateToChat = async (patientData) => {
    // patientData expects: { name, phone, email (optional) }
    try {
      setLoading(true);
      const { conversationId } = await chatwootService.ensureConversationForNavigation(patientData);
      navigate(`/chat/conversations/${conversationId}`);
    } catch (error) {
      console.error("Navigation failed:", error);
      toast({
        title: "Erro ao abrir conversa",
        description: "Não foi possível localizar ou criar a conversa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return { navigateToChat, loading };
};