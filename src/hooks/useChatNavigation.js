import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatwootService } from '@/services/chatwootService';
import { useToast } from '@/components/ui/use-toast';

export const useChatNavigation = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const navigateToChat = (patientData) => {
    // patientData expects: { name, phone, email (optional) }
    try {
      setLoading(true);

      const params = new URLSearchParams();

      // Lógica espelhada do PatientDetails para garantir compatibilidade
      const cleanPhone = (patientData.phone || '').replace(/\D/g, '');
      params.append('phone', cleanPhone);

      params.append('name', patientData.name || 'Visitante');
      if (patientData.email) params.append('email', patientData.email);

      if (patientData.leadId) params.append('leadId', patientData.leadId);

      navigate(`/inbox?${params.toString()}`);
    } catch (error) {
      console.error("Navigation failed:", error);
      toast({
        title: "Erro ao abrir conversa",
        description: "Dados insuficientes para navegação.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return { navigateToChat, loading };
};