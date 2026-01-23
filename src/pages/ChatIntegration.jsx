import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const ChatIntegration = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  
  // URL Base do Chatwoot
  const BASE_URL = "https://chat.audicarefono.com.br";
  
  // Constrói a URL do iframe dinamicamente
  const getIframeUrl = () => {
      const conversationId = searchParams.get('conversation_id');
      const accountId = searchParams.get('account_id') || '1'; // Default ID 1

      if (conversationId) {
          // URL Direta para a Conversa
          return `${BASE_URL}/app/accounts/${accountId}/conversations/${conversationId}`;
      }

      // URL Padrão (Dashboard)
      return `${BASE_URL}/app/accounts/${accountId}/dashboard`;
  };

  const iframeUrl = getIframeUrl();

  // Força reload do iframe se a URL mudar (para navegação entre pacientes funcionar)
  // Usamos key={iframeUrl} para forçar o React a recriar o iframe quando o link muda
  
  return (
    <div className="flex-1 h-full w-full relative bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando Chat...</span>
          </div>
        </div>
      )}
      <div className="w-full h-full overflow-hidden">
        <iframe
          key={iframeUrl} // Truque: Força re-render quando a URL muda
          src={iframeUrl}
          className="w-full h-full border-none"
          style={{ width: '100%', height: '100%' }} // Ajustado para ocupar tudo corretamente
          title="Chatwoot Inbox"
          allow="camera; microphone; geolocation; keyboard-map; clipboard-read; clipboard-write"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

export default ChatIntegration;