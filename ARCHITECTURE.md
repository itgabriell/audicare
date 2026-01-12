# Arquitetura do Sistema

Este documento descreve a arquitetura geral da solução da Caixa de Entrada e sua integração com sistemas externos como o n8n.

## Visão Geral

A arquitetura é baseada em uma stack moderna de "Frontend-as-a-Service", utilizando o **Supabase** como um backend completo e flexível.

### Componentes Principais

1.  **Frontend (React + Vite):**
    *   Uma Single-Page Application (SPA) construída com React que gerencia toda a interface do usuário, estado local e interações.
    *   Comunica-se diretamente com o backend Supabase via API RESTful, RPC e WebSockets.

2.  **Backend (Supabase):**
    *   **PostgreSQL Database:** O coração do sistema, onde todos os dados (clínicas, contatos, conversas, mensagens) são armazenados de forma persistente.
    *   **Auth:** Gerencia a autenticação e autorização de usuários. As **Políticas de RLS (Row Level Security)** garantem que os usuários só possam acessar os dados de suas próprias clínicas, provendo um ambiente multi-tenant seguro.
    *   **Realtime:** Fornece atualizações em tempo real para a interface via WebSockets. Quando um dado muda no banco (ex: uma nova mensagem), o Realtime notifica os clientes inscritos no canal correspondente, que atualizam a UI sem a necessidade de recarregar a página.
    *   **Edge Functions:** Funções Deno (TypeScript/JavaScript) que rodam na borda, perto do usuário. Elas servem como endpoints HTTP para integrações com serviços externos.

3.  **Automação (Ex: n8n):**
    *   Uma plataforma de automação de workflows que atua como uma ponte entre serviços externos (ex: WhatsApp, Facebook Messenger) e a nossa aplicação. O n8n não faz parte do core do sistema, mas é o principal consumidor dos endpoints que criamos.

## Fluxo de Dados Principal

### Fluxo de Entrada: Mensagem Recebida (Ex: WhatsApp -> AudiCare)

1.  **Plataforma Externa:** Um cliente envia uma mensagem para o número de WhatsApp da clínica.
2.  **Gateway de Mensageria (Ex: Z-API):** A API do WhatsApp notifica um gateway, que por sua vez dispara um webhook.
3.  **n8n Workflow:** Este webhook aciona um workflow no n8n.
4.  **Processamento no n8n:** O workflow formata os dados da mensagem em um JSON padronizado.
5.  **Requisição à Edge Function:** O n8n faz uma requisição `POST` para a nossa Edge Function `n8n-webhook` no Supabase.
6.  **Edge Function `n8n-webhook`:**
    *   Recebe a requisição e valida o payload.
    *   Invoca a função de banco de dados (RPC) `handle_incoming_message`.
7.  **Função RPC `handle_incoming_message`:**
    *   Executa de forma atômica (tudo ou nada):
        1.  Chama `find_or_create_contact` para obter o ID do contato baseado no telefone.
        2.  Chama `find_or_create_conversation` para obter o ID da conversa.
        3.  Insere a nova `message` na tabela de mensagens, associada aos IDs corretos.
8.  **Trigger `update_conversation_timestamp`:**
    *   A inserção da nova mensagem dispara um gatilho no banco que atualiza o campo `last_message_at` e incrementa o `unread_count` na tabela `conversations`.
9.  **Supabase Realtime:**
    *   A alteração na tabela `conversations` dispara um evento no Realtime.
10. **Atualização da UI:**
    *   O frontend, que está inscrito no canal de `conversations` da clínica, recebe o evento em tempo real.
    *   O hook `useConversations` processa a atualização, e o React atualiza a UI para mostrar a conversa no topo da lista com o contador de não lidas.

Este fluxo garante que os dados sejam consistentes, as operações sejam eficientes e a experiência do usuário seja fluida e em tempo real.