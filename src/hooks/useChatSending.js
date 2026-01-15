import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { formatPhoneE164, validatePhoneE164 } from '@/lib/phoneUtils';
import { whatsappService } from '../services/whatsappService';
import { queryKeys } from '@/lib/queryClient';
import { commandBus, SendMessageCommand, MarkAsReadCommand } from '@/lib/cqrs';

// Hook especializado para envio de mensagens
export function useChatSending(activeConversation) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation para enviar mensagem via CQRS
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const command = new SendMessageCommand(messageData);
      const result = await commandBus.execute(command);

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar cache de conversas para atualizar lista
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
    onError: (error, variables) => {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Falha ao enviar mensagem.",
        variant: "destructive",
        duration: 6000
      });
    }
  });

  // Função principal para enviar mensagem
  const sendMessage = useCallback(async (payload) => {
    if (!activeConversation) return;

    // Validações básicas
    const isMedia = payload?.media_url || payload?.file;
    const isAudio = payload?.message_type === 'audio' || payload?.type === 'audio';

    if (!isMedia && !payload?.content?.trim() && typeof payload !== 'string') {
      return;
    }

    setIsSending(true);

    try {
      // Formatar e validar telefone
      const rawPhone = payload?.phone || activeConversation.contact?.phone || activeConversation.contact?.mobile_phone;
      const phoneE164 = formatPhoneE164(rawPhone);

      if (!validatePhoneE164(phoneE164)) {
        throw new Error('Telefone inválido para envio');
      }

      // Preparar dados da mensagem
      const messageData = {
        conversation: activeConversation,
        phone: phoneE164,
        content: typeof payload === 'string' ? payload : (payload?.content || payload?.caption || ''),
        message_type: payload?.message_type || payload?.type || 'text',
        media_url: payload?.media_url,
        file: payload?.file,
        isMedia,
        isAudio
      };

      // Usar CQRS para enviar
      await sendMessageMutation.mutateAsync(messageData);

      // Feedback de sucesso
      toast({
        title: "Mensagem enviada",
        description: "Mensagem enviada com sucesso!",
        duration: 2000
      });

    } catch (error) {
      console.error('Erro no envio:', error);

      // Toast de erro já é mostrado pela mutation
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, sendMessageMutation, toast]);

  // Função para reenviar mensagem com falha
  const retryMessage = useCallback(async (messageId) => {
    try {
      // Buscar dados da mensagem com falha
      const { data: failedMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (!failedMessage) {
        throw new Error('Mensagem não encontrada');
      }

      // Preparar payload para reenvio
      const retryPayload = {
        content: failedMessage.content,
        message_type: failedMessage.message_type,
        media_url: failedMessage.media_url,
        phone: activeConversation?.contact?.phone
      };

      await sendMessage(retryPayload);

      // Remover mensagem com falha (será substituída pela nova)
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

    } catch (error) {
      console.error('Erro ao reenviar:', error);
      toast({
        title: "Erro ao reenviar",
        description: "Não foi possível reenviar a mensagem.",
        variant: "destructive"
      });
    }
  }, [activeConversation, sendMessage, toast]);

  // Função para cancelar envio
  const cancelSending = useCallback(() => {
    setIsSending(false);
    // Cancelar mutation se estiver pendente
    sendMessageMutation.reset();
  }, [sendMessageMutation]);

  return {
    sendMessage,
    retryMessage,
    cancelSending,
    isSending: isSending || sendMessageMutation.isPending,
    error: sendMessageMutation.error
  };
}

// Command Handler para envio de mensagens
class SendMessageCommandHandler {
  async handle(command) {
    const {
      conversation,
      phone,
      content,
      message_type,
      media_url,
      file,
      isMedia,
      isAudio
    } = command.data;

    try {
      let result;

      // Enviar via WhatsApp API
      if (isAudio && file) {
        result = await whatsappService.sendAudio(phone, file);
      } else if (isMedia && file) {
        result = await whatsappService.sendMedia(phone, file, message_type, content);
      } else {
        result = await whatsappService.sendMessage(phone, content);
      }

      // Inserir no banco de dados
      const messageData = {
        conversation_id: conversation.id,
        clinic_id: conversation.clinic_id,
        contact_id: conversation.contact_id,
        direction: 'outbound',
        message_type: message_type || 'text',
        content,
        media_url: result?.media_url || media_url,
        status: 'sent',
        sender_type: 'user'
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      // Marcar como processada para evitar duplicação
      if (data.id) {
        whatsappService.markMessageProcessed(data.id);
      }

      return data;

    } catch (error) {
      // Em caso de erro, criar mensagem temporária com status failed
      const failedMessage = {
        conversation_id: conversation.id,
        clinic_id: conversation.clinic_id,
        contact_id: conversation.contact_id,
        direction: 'outbound',
        message_type: message_type || 'text',
        content,
        media_url,
        status: 'failed',
        sender_type: 'user',
        created_at: new Date().toISOString()
      };

      // Salvar mensagem com falha para possível reenvio
      const { data: failedData } = await supabase
        .from('messages')
        .insert([failedMessage])
        .select()
        .single();

      throw new Error(`Falha no envio: ${error.message}`);
    }
  }
}

// Command Handler para marcar como lida
class MarkAsReadCommandHandler {
  async handle(command) {
    const { conversationId } = command.data;

    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (error) throw error;

    return { success: true };
  }
}

// Registrar handlers
commandBus.register('SendMessageCommand', new SendMessageCommandHandler());
commandBus.register('MarkAsReadCommand', new MarkAsReadCommandHandler());
