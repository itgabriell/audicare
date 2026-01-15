import { useState } from 'react';
import { useChatConversations } from './useChatConversations';
import { useChatMessages } from './useChatMessages';
import { useChatSending } from './useChatSending';

// Hook principal refatorado - combina múltiplos hooks especializados
export function useWhatsApp() {
  const [activeConversation, setActiveConversation] = useState(null);

  // Hooks especializados
  const {
    conversations,
    loading: loadingConversations,
    error: conversationsError,
    refetch: refreshConversations
  } = useChatConversations();

  const {
    messages,
    loadingMessages,
    refetch: refreshMessages
  } = useChatMessages(activeConversation?.id, activeConversation);

  const {
    sendMessage,
    retryMessage,
    cancelSending,
    isSending,
    error: sendingError
  } = useChatSending(activeConversation);

  // Funções de controle
  const selectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const updateActiveConversation = (updatedConversation) => {
    setActiveConversation(updatedConversation);
  };

  const refresh = () => {
    refreshConversations();
    if (activeConversation?.id) {
      refreshMessages();
    }
  };

  return {
    // Dados
    conversations,
    activeConversation,
    messages,

    // Estados de loading
    loading: loadingConversations,
    loadingMessages,
    isSending,

    // Estados de erro
    error: conversationsError || sendingError,

    // Ações
    selectConversation,
    sendMessage,
    retryMessage,
    cancelSending,
    refresh,
    updateActiveConversation
  };
}

export default useWhatsApp;
