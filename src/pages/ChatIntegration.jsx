import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { chatwootService } from '@/services/chatwootService';

const ChatIntegration = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [computedUrl, setComputedUrl] = useState(null);

  // URL Base do Chatwoot
  // NOTA: Idealmente, deveria vir de uma variável de ambiente, mas mantendo o padrão já existente
  const BASE_URL = "https://chat.audicarefono.com.br";

  useEffect(() => {
    const resolveUrl = async () => {
      setIsLoading(true);
      try {
        const conversationId = searchParams.get('conversation_id');
        const accountId = searchParams.get('account_id') || '2';

        // Caso 1: ID da conversa já fornecido (Link direto)
        if (conversationId) {
          setComputedUrl(`${BASE_URL}/app/accounts/${accountId}/conversations/${conversationId}`);
          return;
        }

        // Caso 2: Temos telefone? Tentar resolver a conversa
        const phone = searchParams.get('phone');
        const name = searchParams.get('name');
        const email = searchParams.get('email');

        if (phone) {
          // Simula um objeto paciente para o serviço
          const patientMock = {
            name: name || 'Visitante',
            email: email || '',
            phone: phone // O serviço já trata a limpeza
          };

          try {
            const result = await chatwootService.ensureConversationForNavigation(patientMock);
            if (result && result.conversationId) {
              setComputedUrl(`${BASE_URL}/app/accounts/${result.accountId || accountId}/conversations/${result.conversationId}`);
              return;
            }
          } catch (err) {
            console.error("Falha ao resolver conversa Chatwoot:", err);
            // Se falhar, cai no dashboard, mas loga o erro
          }
        }

        // Caso 3: Fallback para Dashboard
        setComputedUrl(`${BASE_URL}/app/accounts/${accountId}/dashboard`);

      } finally {
        setIsLoading(false);
      }
    };

    resolveUrl();
  }, [searchParams]); // Re-executa se os parâmetros mudarem

  if (!computedUrl) return null; // Ou um loading spin inicial

  return (
    <div className="flex-1 h-full w-full relative bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {searchParams.get('phone') ? 'Localizando conversa...' : 'Carregando Chat...'}
            </span>
          </div>
        </div>
      )}
      <div className="w-full h-full">
        <iframe
          key={computedUrl} // Força re-render real quando URL muda
          src={computedUrl}
          className="w-full h-full border-none"
          style={{ width: '100%', height: '100%' }}
          title="Chatwoot Inbox"
          allow="camera; microphone; geolocation; keyboard-map; clipboard-read; clipboard-write"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

export default ChatIntegration;