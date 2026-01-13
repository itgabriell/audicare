import React, { useState } from 'react';
// IMPORTANTE: Use a pasta 'inbox' (onde colocamos os arquivos novos)
import ConversationList from '../components/inbox/ConversationList';
import ChatWindow from '../components/inbox/ChatWindow';
import RightPanel from '../components/inbox/RightPanel';
import { useWhatsApp } from '../hooks/useWhatsApp';
import DeduplicationTestPanel from '../components/Debug/DeduplicationTestPanel';
import { Button } from '@/components/ui/button';

const Inbox = () => {
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    loadingMessages,
    isSending,
    selectConversation,
    sendMessage,
    refresh,
    updateActiveConversation
  } = useWhatsApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showTestPanel, setShowTestPanel] = useState(false);

  return (
    // Seu layout original (mantido)
    <div className="flex flex-col h-[calc(100vh-1.5rem)] overflow-hidden">
      {/* Painel de Teste (pode ser removido após validação) */}
      {showTestPanel && (
        <div className="p-4 border-b bg-card">
          <DeduplicationTestPanel />
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2"
            onClick={() => setShowTestPanel(false)}
          >
            Fechar Painel de Teste
          </Button>
        </div>
      )}
      
      {/* Botão para abrir painel de teste (apenas em desenvolvimento) */}
      {!showTestPanel && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-50">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTestPanel(true)}
            className="text-xs"
          >
            🧪 Testar Deduplicação
          </Button>
        </div>
      )}
      
      <div className="flex h-full overflow-hidden bg-background border-t border-b md:border md:rounded-xl shadow-sm">
        
        {/* 1. LISTA DE CONVERSAS */}
      <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r bg-card`}>
        <ConversationList 
          conversations={conversations}
          activeId={activeConversation?.id}
          onSelect={selectConversation}
          loading={loading}
        />
      </div>

      {/* 2. JANELA DE CHAT */}
      <div className={`${!activeConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-background relative min-w-0`}>
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          loadingMessages={loadingMessages}
          isSending={isSending}
          onSendMessage={sendMessage}
          onBack={() => selectConversation(null)}
          refetch={refresh}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onToggleInfo={() => setShowRightPanel(!showRightPanel)}
          onConversationUpdate={updateActiveConversation}
        />
      </div>

      {/* 3. PAINEL DE INFORMAÇÕES */}
      {activeConversation && showRightPanel && (
        <div className="hidden xl:flex w-80 flex-col border-l bg-card overflow-hidden">
          <RightPanel 
            contactId={activeConversation?.contact?.id}
            onClose={() => setShowRightPanel(false)}
          />
        </div>
      )}
      </div>
    </div>
  );
};

export default Inbox;
