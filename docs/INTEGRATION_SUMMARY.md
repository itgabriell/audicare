# Relatório Resumo da Integração (Integration Summary Report)

Este documento apresenta uma visão geral da arquitetura de integração do sistema AudiCare, focando na funcionalidade de mensagens via WhatsApp (integrada com UAZAPI) e na robustez do sistema.

## 1. Visão Geral da Arquitetura de Mensagens

O sistema de mensagens da AudiCare é construído sobre uma arquitetura robusta que garante comunicação em tempo real, resiliência a falhas de rede e escalabilidade.

*   **Frontend (React/Vite):** Interface do usuário onde os agentes interagem com as conversas. Utiliza `whatsappService` para comunicação com o backend e `webhookReceiverService` para atualizações em tempo real via Supabase.
*   **Backend (Supabase Edge Functions / APIs):** Atua como um orquestrador, recebendo requisições do frontend, interagindo com o UAZAPI e persistindo dados no Supabase.
*   **UAZAPI:** Provedor de API para o WhatsApp, responsável pelo envio e recebimento físico das mensagens.
*   **Supabase (PostgreSQL / Realtime):** Banco de dados primário para persistência de conversas, mensagens, contatos e configurações. O Realtime do Supabase é crucial para a sincronização instantânea de eventos.

### Fluxo de Mensagens (End-to-End)

1.  **Envio de Mensagem (Frontend -> Contato):**
    *   Usuário envia mensagem no `ChatWindow`.
    *   `useWhatsApp` chama `whatsappService.sendText/sendMedia`.
    *   `whatsappService` faz uma requisição `POST` para o endpoint `/wa/send-text` ou `/wa/send-media` no backend.
    *   O backend (via Supabase Edge Function `send-zapi-message`) aciona o UAZAPI para enviar a mensagem.
    *   UAZAPI envia a mensagem ao destinatário no WhatsApp.
    *   O backend atualiza o status da mensagem no Supabase (`messages` table).
    *   O Realtime do Supabase notifica o frontend sobre a atualização de status.

2.  **Recebimento de Mensagem (Contato -> Frontend):**
    *   Mensagem recebida pelo UAZAPI.
    *   UAZAPI envia um webhook para o backend (`zapi-webhook` Edge Function).
    *   O backend processa o webhook, atualiza ou insere mensagens e contatos no Supabase.
    *   O Realtime do Supabase (`messages`, `conversations`, `contacts` tables) envia eventos para o frontend.
    *   `webhookReceiverService` no frontend capta esses eventos e notifica `useWhatsApp` e outros componentes.
    *   `ChatWindow` e `ConversationList` são atualizados em tempo real.

## 2. Endpoints e Uso Correto

A comunicação com o backend (via `src/services/whatsappService.js`) utiliza os seguintes endpoints:

*   **`GET /wa/health-check`**:
    *   **Uso:** Verifica a conectividade do backend e o status da instância do WhatsApp (UAZAPI).
    *   **Resposta Esperada:** `{ "connected": true, "status": "online", "message": "..." }` ou `{ "connected": false, "status": "offline", "message": "..." }`.
    *   **Uso:** `whatsappService.checkConnection()`
*   **`GET /wa/contacts`**:
    *   **Uso:** Busca a lista de contatos do WhatsApp gerenciados pela clínica. Suporta paginação.
    *   **Parâmetros:** `page`, `limit`.
    *   **Resposta Esperada:** `[{ id: "...", name: "...", phone: "...", ... }]`
    *   **Uso:** `whatsappService.getContacts(page, limit)`
*   **`GET /wa/chat-history/:phone`**:
    *   **Uso:** Recupera o histórico de mensagens para um contato específico.
    *   **Parâmetros:** `phone` (na URL), `page`, `limit`.
    *   **Resposta Esperada:** `[{ id: "...", content: "...", direction: "...", status: "...", ... }]`
    *   **Uso:** `whatsappService.getMessages(phone, page, limit)`
*   **`POST /wa/send-text`**:
    *   **Uso:** Envia uma mensagem de texto para um contato.
    *   **Corpo da Requisição:** `{ "to": "telefone", "text": "sua mensagem" }`
    *   **Resposta Esperada:** `{ "messageId": "...", "status": "sent" }`
    *   **Uso:** `whatsappService.sendText(to, text)`
*   **`POST /wa/send-media`**:
    *   **Uso:** Envia arquivos de mídia (imagem, vídeo, áudio, documento) para um contato.
    *   **Corpo da Requisição:** `FormData` com `to`, `file`, `type` (image, video, audio, document).
    *   **Resposta Esperada:** `{ "messageId": "...", "status": "sent", "mediaUrl": "..." }`
    *   **Uso:** `whatsappService.sendMedia(to, file)`
*   **`POST /wa/mark-read`**:
    *   **Uso:** Marca as mensagens de uma conversa como lidas no UAZAPI.
    *   **Corpo da Requisição:** `{ "phone": "telefone" }`
    *   **Resposta Esperada:** `{ "success": true }`
    *   **Uso:** `whatsappService.markAsRead(phone)`
*   **`POST /wa/restart`**:
    *   **Uso:** Reinicia a instância do UAZAPI. Pode ser necessário para resolver problemas de conexão.
    *   **Corpo da Requisição:** `{}` (vazio)
    *   **Resposta Esperada:** `{ "success": true }`
    *   **Uso:** `whatsappService.restartInstance()`

## 3. JWT Token Requirements

*   Todas as requisições autenticadas para o backend exigem um **JWT (JSON Web Token) válido** no cabeçalho `Authorization` com o prefixo `Bearer`.
*   O token é obtido da sessão do Supabase (`supabase.auth.getSession()`) e deve ser incluído em cada requisição.
*   **Verificação:** O backend valida o token para autorizar o acesso aos recursos da clínica. Tokens expirados ou inválidos resultarão em `401 Unauthorized`.
*   **Renovação:** A biblioteca `supabase-js` gerencia automaticamente a renovação do token.

## 4. UAZAPI Configuration Requirements

O UAZAPI é o gateway para o WhatsApp. Sua configuração correta é fundamental.

*   **Credenciais de Acesso:** O backend precisa das chaves `Z_API_KEY` e `Z_API_SECURITY_TOKEN` (armazenadas como Supabase Secrets) para se autenticar com o UAZAPI.
*   **Webhook Configurável:** Um URL de webhook no UAZAPI deve ser configurado para apontar para a Edge Function `zapi-webhook` do Supabase. Isso permite que o UAZAPI notifique nosso backend sobre novas mensagens e atualizações de status.
*   **Instância Ativa:** A instância do WhatsApp no UAZAPI deve estar conectada (escaneada via QR Code e ativa). O `health-check` do backend verificará isso.
*   **Formato de Número:** Todos os números de telefone devem ser enviados no formato E.164 (ex: `+5511999998888`).

## 5. Requisitos de Backend

O backend é responsável pela comunicação segura e eficiente entre o frontend e o UAZAPI.

*   **Edge Functions do Supabase:** As funções de backend (`send-zapi-message`, `zapi-webhook`, `zapi-health-check`, etc.) devem estar implantadas e operacionais no Supabase.
*   **Acesso ao Banco de Dados:** As Edge Functions e as APIs devem ter permissão para ler e escrever nas tabelas `messages`, `conversations`, `contacts`, etc., respeitando as políticas de RLS.
*   **Tratamento de Webhooks:** O `zapi-webhook` deve ser robusto para processar eventos do UAZAPI, realizar deduplicação e garantir a consistência dos dados.
*   **Lógica de Retry:** O backend deve implementar lógica de retry para chamadas externas (UAZAPI) para maior resiliência.
*   **Validação de Dados:** Todas as entradas de API devem ser validadas para prevenir dados inválidos ou ataques.

## 6. Guia de Início Rápido para Testes

Para um teste rápido da integração:

1.  **Abra o Painel de Testes de Integração:** Clique no botão "Testes de Integração" no canto inferior esquerdo da tela da Inbox.
2.  **Configure o Telefone de Teste:** Insira um número de WhatsApp válido (seu próprio, por exemplo) no campo "Telefone de Teste" (formato E.164, ex: `+5511999999999`).
3.  **Execute o Teste de Validação JWT:** Clique no botão "Play" ao lado de "Validação de Token JWT".
    *   **Espera-se:** Status `SUCCESS`.
4.  **Execute o Teste de Health Check:** Clique no botão "Play" ao lado de "API Health Check".
    *   **Espera-se:** Status `SUCCESS`. Isso confirma a conexão do backend e do UAZAPI.
5.  **Execute o Teste de Envio de Mensagem:** Clique no botão "Play" ao lado de "Enviar Mensagem (Teste)".
    *   **Espera-se:** Status `SUCCESS`. Você deve receber uma mensagem de teste no número configurado.
6.  **Execute o Teste de Simulação de Webhook:** Clique no botão "Play" ao lado de "Simular Webhook (Recebimento)".
    *   **Espera-se:** Status `SUCCESS`. Uma mensagem simulada aparecerá na sua Inbox.
7.  **Verifique os Logs:** A aba "Logs de Execução" no Painel de Testes de Integração e o "API Debug Panel" (canto inferior direito) fornecerão feedback detalhado sobre cada passo.

---

Este resumo serve como ponto de partida para entender a complexidade e interdependência dos componentes. Para detalhes mais aprofundados, consulte a documentação específica de cada serviço.