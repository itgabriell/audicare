# Revisão Completa de Integração (Integration Review)

Este documento fornece uma visão técnica detalhada da arquitetura de integração do sistema AudiCare, focando especificamente no módulo de Inbox/WhatsApp, backend Supabase e serviços UAZAPI.

---

## 1. Visão Geral do Sistema

O módulo de Inbox do AudiCare opera em uma arquitetura híbrida que combina:
1.  **Frontend (React/Vite):** Gerencia estado local, cache (IndexedDB) e interface do usuário.
2.  **Backend (Supabase):** Atua como banco de dados relacional (PostgreSQL), gerenciador de autenticação e camada de Realtime via WebSockets.
3.  **Edge Functions:** Processam lógica de negócios sensível e interações diretas com APIs externas.
4.  **Gateway de Mensagens (UAZAPI):** Instância externa responsável por conectar-se à rede do WhatsApp.

---

## 2. Endpoints Frontend e Uso

Os endpoints são gerenciados centralmente em `src/config/apiConfig.js` e consumidos por `src/services/whatsappService.js`.

| Constante | Endpoint | Método | Uso Correto |
| :--- | :--- | :--- | :--- |
| `SEND_TEXT` | `/wa/send-text` | `POST` | Envio de mensagens de texto simples. Requer `{ to, text }`. |
| `SEND_MEDIA` | `/wa/send-media` | `POST` | Envio de arquivos (imagem, vídeo, áudio, docs). Requer `FormData`. |
| `GET_CONTACTS` | `/wa/contacts` | `GET` | Sincronização inicial da lista de contatos. Suporta paginação. |
| `GET_MESSAGES` | `/wa/chat-history/:phone` | `GET` | Busca histórico de mensagens do WhatsApp. |
| `CHECK_STATUS` | `/wa/health-check` | `GET` | Verifica se a instância UAZAPI está conectada. |
| `RESTART` | `/wa/restart` | `POST` | Força reinicialização da instância WhatsApp. |
| `MARK_READ` | `/wa/mark-read` | `POST` | Marca mensagens como lidas no WhatsApp. |

**Nota:** O frontend utiliza `fetchWithRetry` para garantir resiliência contra falhas de rede momentâneas.

---

## 3. Contrato de API Backend (Edge Functions)

As Edge Functions (`src/supabase-edge-functions/`) esperam payloads específicos e retornam JSON padronizado.

### `send-zapi-message`
*   **Entrada:** `{ "messageId": "UUID" }`
*   **Lógica:** Busca a mensagem na tabela `messages`, formata para a UAZAPI e envia.
*   **Saída Sucesso:** `{ "success": true, "messageId": "wa_id_..." }`
*   **Saída Erro:** `{ "error": "Descrição do erro" }`

### `zapi-webhook`
*   **Entrada:** Payload JSON enviado pelo UAZAPI (eventos de mensagem, status, etc).
*   **Cabeçalhos:** Deve conter `X-Security-Token` ou similar validado contra `Z_API_SECURITY_TOKEN`.
*   **Lógica:** Insere/Atualiza tabelas `messages` e `contacts`.

---

## 4. Fluxo de Integração UAZAPI

1.  **Envio (Outbound):**
    *   Usuário digita mensagem -> `useMessages.js` cria registro otimista na UI.
    *   Mensagem é salva no Supabase (`messages` table) com status `pending`.
    *   Edge Function `send-zapi-message` é invocada.
    *   Function chama API da UAZAPI.
    *   UAZAPI retorna ID do WhatsApp -> Banco atualizado para `sent`.

2.  **Recebimento (Inbound):**
    *   WhatsApp recebe mensagem -> UAZAPI dispara Webhook.
    *   Edge Function `zapi-webhook` processa payload.
    *   Registro inserido na tabela `messages`.
    *   Supabase Realtime notifica frontend -> UI atualiza.

---

## 5. Autenticação e JWT

*   **Mecanismo:** Todo request para as Edge Functions deve incluir o cabeçalho `Authorization: Bearer <ACCESS_TOKEN>`.
*   **Obtenção:** O token é obtido via `supabase.auth.getSession()` no frontend.
*   **Validação:** As Edge Functions validam o token automaticamente (se configuradas para exigir autenticação) ou manualmente para extrair o usuário.
*   **Segurança:** RLS (Row Level Security) no banco de dados impede que um token acesse dados de outra clínica (`clinic_id`).

---

## 6. Implementação do Webhook Receiver

O serviço `src/services/webhookReceiverService.js` não recebe HTTP diretamente. Ele "escuta" as mudanças no banco causadas pelo webhook real (Edge Function).

*   **Canal:** `table-db-changes`
*   **Tabelas Monitoradas:** `messages` (INSERT, UPDATE), `contacts` (UPDATE).
*   **Eventos Disparados:** `new_message`, `message_update`, `contact_update`.
*   **Deduplicação:** Utiliza um `Set` de IDs processados para evitar re-renderizações em caso de eventos duplicados do Realtime.

---

## 7. Arquitetura de Sincronização em Tempo Real

A arquitetura evita polling agressivo:
1.  **Carga Inicial:** `whatsappService.getContacts()` e `getMessages()` via REST.
2.  **Delta Updates:** Supabase Realtime empurra novas mensagens.
3.  **Sync de Segurança:** Um polling lento (30s) roda em background (`useWhatsApp.js`) para garantir consistência eventual caso o WebSocket caia.

---

## 8. Mecanismo Offline e Fila

Implementado em `src/hooks/useMessageCache.js` e `src/utils/cacheManager.js`.

1.  **Detecção:** `navigator.onLine` e erros de fetch.
2.  **Armazenamento:** Mensagens falhas são salvas no IndexedDB store `offline_queue`.
3.  **Recuperação:** Quando `window.addEventListener('online')` dispara, o `processOfflineQueue` itera sobre os itens e tenta reenviar.
4.  **UI:** Mensagens na fila aparecem com status "Aguardando conexão".

---

## 9. Estratégia de Tratamento de Erros

*   **UI:** `ErrorBoundary` global captura falhas de renderização. Toasts informam erros de operação.
*   **Serviços:** `fetchWithRetry` tenta requisições até 3 vezes com backoff exponencial.
*   **Backend:** Edge Functions retornam códigos HTTP apropriados (4xx, 5xx) que são logados pelo `debugService.js`.
*   **Falha Crítica:** Se a UAZAPI estiver fora, o sistema entra em modo "Degradado" (apenas leitura local/cache).

---

## 10. Melhores Práticas de Segurança

1.  **RLS Rigoroso:** Todas as queries incluem filtro implícito ou explícito por `clinic_id`.
2.  **Segredos:** Chaves de API (UAZAPI, Supabase Service Role) ficam APENAS nos Supabase Secrets, nunca no código cliente.
3.  **Sanitização:** Inputs de texto são sanitizados pelo React por padrão contra XSS.
4.  **Webhooks:** Validação de token de segurança (`Z_API_SECURITY_TOKEN`) impede injeção de dados falsos via endpoint de webhook.

---

## 11. Otimização de Performance

*   **Cache Local:** IndexedDB (`idb`) armazena até 1000 mensagens por conversa para carregamento instantâneo.
*   **Virtualização:** Listas de mensagens e conversas devem usar virtualização (implementado via paginação/limit por enquanto).
*   **Code Splitting:** Rotas carregadas com `React.lazy` em `App.jsx`.
*   **Assets:** Imagens e mídias carregadas sob demanda.

---

## 12. Monitoramento e Logs

*   **Ferramenta:** `MonitoringDashboard.jsx`.
*   **Métricas:** Latência de API, Taxa de Erros, Status de Conexão, Tamanho da Fila Offline.
*   **Logs:** `debugService.js` mantém um buffer circular de logs em memória para exportação e análise rápida via console.

---

## 13. Troubleshooting: Árvore de Decisão

*   **Problema: Mensagens não chegam.**
    *   Conexão Internet OK? -> Não: Verifique rede local.
    *   Sim -> Status UAZAPI no Dashboard é "Online"?
        *   Não: Reinicie instância (`/wa/restart`).
        *   Sim: Verifique logs do `webhookReceiver`. O Realtime está conectado?

*   **Problema: Erro de Autenticação.**
    *   Recarregue a página (refresh token pode ter expirado).
    *   Verifique se a data/hora do sistema cliente está correta.

*   **Problema: Lentidão.**
    *   Limpe o cache do navegador (IndexedDB pode estar muito cheio).
    *   Verifique latência no `MonitoringDashboard`.

---

## 14. Ferramentas de Validação Disponíveis

No sistema, acesse a Inbox e utilize os painéis flutuantes ou botões de debug:
1.  **ValidationTestPanel:** Roda suíte completa de testes automatizados.
2.  **APIDebugPanel:** Permite testar endpoints RAW e ver respostas JSON.
3.  **IntegrationTestPanel:** Testa fluxos completos (criar contato -> enviar msg).
4.  **HealthCheckPanel:** Visão simplificada de status (sinal verde/vermelho).

---

## 15. Procedimento de Validação Passo-a-Passo

1.  Abra o painel de Inbox.
2.  Clique no ícone de "Besouro" (Bug/Validação).
3.  Na aba "Execução", clique em "Executar Todos".
4.  Aguarde todos os testes ficarem verdes.
5.  Se algum falhar, expanda o detalhe para ver o erro (Stack Trace).
6.  Exporte o relatório JSON se precisar enviar para o suporte.

---

## 16. Respostas Esperadas (API)

**GET /contacts**