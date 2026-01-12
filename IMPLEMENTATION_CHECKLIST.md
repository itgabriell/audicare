# Checklist de Implementação do Módulo de Atendimento Multicanal

Este checklist detalha as tarefas restantes para a implementação completa do módulo de Atendimento Multicanal, organizadas por fase.

## Fase 1: Estrutura Base (Concluída)

*   [x] Criar página `Inbox.jsx` com layout de 3 colunas.
*   [x] Criar `ConversationList.jsx` com filtros e busca.
*   [x] Criar `ChatWindow.jsx` com histórico de mensagens.
*   [x] Criar `ContactPanel.jsx` com dados do contato.
*   [x] Criar `ChatInput.jsx` com input de texto e seletor de template.
*   [x] Criar hook `useConversations`.
*   [x] Criar hook `useMessages`.
*   [x] Criar hook `useContactDetails`.
*   [x] Criar `lib/messaging.js` com funções auxiliares (mockadas).
*   [x] Adicionar rota `/inbox` em `App.jsx`.
*   [x] Criar `ChannelBadge.jsx` para exibir ícone e nome do canal.
*   [x] Criar `ChannelFilter.jsx` para filtrar por canal.
*   [x] Criar `ChannelSelector.jsx` para seleção de canal.
*   [x] Criar `ChannelConnectionStatus.jsx` para exibir status de conexão.
*   [x] Criar `ChannelTestConnection.jsx` para testar conexão.
*   [x] Criar `ChannelCredentialsDialog.jsx` para configurar credenciais.
*   [x] Criar `ChannelConfigCard.jsx` para cada canal.
*   [x] Criar página `ChannelSettings.jsx` em `/settings/channels`.
*   [x] Criar hook `useChannelSettings`.
*   [x] Criar `lib/channelConfig.js` com validações.
*   [x] Adicionar rota `/settings/channels` em `App.jsx`.
*   [x] Adicionar link em `Settings.jsx` para `ChannelSettings`.

## Fase 2: Integração WhatsApp (Próxima)

*   **Backend (Supabase):**
    *   [ ] Implementar a função `handle_incoming_message` no Supabase para processar o payload real do WhatsApp (via n8n).
    *   [ ] Criar Edge Function `send-whatsapp-message` para enviar mensagens do frontend para a API do WhatsApp (via n8n).
    *   [ ] Atualizar `lib/messaging.js` para usar `send-whatsapp-message` ao enviar mensagens de conversas do WhatsApp.
    *   [ ] Configurar `channel_credentials` para WhatsApp no banco de dados.
*   **Frontend:**
    *   [ ] Atualizar `useConversations.js` e `useMessages.js` para usar o Realtime do Supabase para `conversations` e `messages`.
    *   [ ] Implementar `markConversationAsRead` em `lib/messaging.js` e integrá-lo ao `ChatWindow`.
    *   [ ] Aprimorar `ChatInput.jsx` para lidar com anexos (upload para Supabase Storage).
    *   [ ] Exibir status de entrega/leitura das mensagens no `ChatWindow`.
*   **Automação (n8n):**
    *   [ ] Configurar workflow do n8n para receber webhooks da API do WhatsApp.
    *   [ ] Configurar workflow do n8n para chamar `n8n-webhook` do Supabase com o payload padronizado.
    *   [ ] Configurar workflow do n8n para receber requisições de `send-whatsapp-message` e enviar para a API do WhatsApp.

## Fase 3: Integração Instagram

*   **Backend (Supabase):**
    *   [ ] Adaptar `handle_incoming_message` para processar payload do Instagram (via n8n).
    *   [ ] Criar Edge Function `send-instagram-message`.
    *   [ ] Atualizar `lib/messaging.js` para usar `send-instagram-message`.
    *   [ ] Configurar `channel_credentials` para Instagram.
*   **Frontend:**
    *   [ ] Aprimorar `ChatInput.jsx` para lidar com anexos específicos do Instagram.
*   **Automação (n8n):**
    *   [ ] Configurar workflow do n8n para receber webhooks da API do Instagram.
    *   [ ] Configurar workflow do n8n para chamar `n8n-webhook` do Supabase.
    *   [ ] Configurar workflow do n8n para receber requisições de `send-instagram-message` e enviar para a API do Instagram.

## Fase 4: Integração Facebook Messenger

*   **Backend (Supabase):**
    *   [ ] Adaptar `handle_incoming_message` para processar payload do Facebook Messenger (via n8n).
    *   [ ] Criar Edge Function `send-facebook-message`.
    *   [ ] Atualizar `lib/messaging.js` para usar `send-facebook-message`.
    *   [ ] Configurar `channel_credentials` para Facebook.
*   **Frontend:**
    *   [ ] Aprimorar `ChatInput.jsx` para lidar com anexos específicos do Facebook.
*   **Automação (n8n):**
    *   [ ] Configurar workflow do n8n para receber webhooks da API do Facebook Messenger.
    *   [ ] Configurar workflow do n8n para chamar `n8n-webhook` do Supabase.
    *   [ ] Configurar workflow do n8n para receber requisições de `send-facebook-message` e enviar para a API do Facebook Messenger.

## Fase 5: Templates de Mensagem Avançados

*   **Backend (Supabase):**
    *   [ ] Implementar CRUD para `message_templates` no Supabase.
    *   [ ] Criar RLS para `message_templates`.
*   **Frontend:**
    *   [ ] Criar página de gerenciamento de templates (`/settings/message-templates`).
    *   [ ] Conectar `ChatInput.jsx` para carregar templates reais.
    *   [ ] Implementar preenchimento de variáveis dinâmicas nos templates (ex: `{{contact_name}}`).

## Fase 6: Agendamentos Integrados

*   **Backend (Supabase):**
    *   [ ] Implementar lógica para associar `contacts` a `patients` via `contact_patients`.
    *   [ ] Aprimorar `getContactDetails` para buscar agendamentos associados.
*   **Frontend:**
    *   [ ] Desenvolver UI para visualização de agendamentos no `ContactPanel`.
    *   [ ] Integrar modal de agendamento (`AppointmentDialog`) ao `ContactPanel`.
    *   [ ] Adicionar sugestões de templates de agendamento no `ChatInput`.

## Fase 7: Automações e IA

*   [ ] Integrar com ferramentas de automação (n8n).
*   [ ] Implementar chatbots ou IA generativa para respostas automáticas.
*   [ ] Desenvolver análise de sentimento.
*   [ ] Adicionar respostas rápidas sugeridas.