# Guia de Desenvolvimento: Próximas Etapas para Atendimento Multicanal

Este guia fornece instruções detalhadas para as próximas etapas de desenvolvimento do módulo de Atendimento Multicanal, baseando-se na estrutura já estabelecida e nos planos de integração.

## 1. Conectar `lib/messaging.js` ao Supabase

Atualmente, as funções em `src/lib/messaging.js` utilizam dados mockados. A primeira e mais crucial etapa é conectar essas funções ao seu backend Supabase.

*   **Objetivo:** Substituir dados mockados por chamadas reais à API do Supabase.
*   **Ações:**
    1.  **`getConversations(clinicId)`:**
        *   Usar `supabase.from('conversations').select('*, contacts(name, phone, avatar_url)').eq('clinic_id', clinicId).order('last_message_at', { ascending: false });`
        *   Certifique-se de que a query seleciona também os dados do contato para exibir na `ConversationList`.
    2.  **`getMessages(conversationId)`:**
        *   Usar `supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });`
    3.  **`createMessage({ content, conversationId, contactId, clinicId, senderType })`:**
        *   Usar `supabase.from('messages').insert({...}).select();`
        *   Considere passar `sender_type` como um parâmetro para esta função (`'user'` para mensagens enviadas da UI).
    4.  **`getContactDetails(contactId)`:**
        *   Usar `supabase.from('contacts').select('*').eq('id', contactId).single();`
        *   Para agendamentos, será necessário buscar os agendamentos relacionados ao paciente associado a este contato, usando a tabela `contact_patients`.

## 2. Implementar Realtime do Supabase

O realtime é fundamental para uma experiência fluida na caixa de entrada.

*   **Objetivo:** Atualizar a UI em tempo real com novas mensagens e alterações nas conversas.
*   **Ações:**
    1.  **`useConversations.js`:**
        *   Dentro do `useEffect`, após o `fetchConversations`, crie uma assinatura para a tabela `conversations` filtrando por `clinic_id`.
        *   `supabase.channel('public:conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `clinic_id=eq.${profile.clinic_id}` }, payload => { ... }).subscribe();`
        *   Atualize o estado `conversations` com base nos eventos de `INSERT`, `UPDATE`.
        *   **Lembre-se de remover a inscrição (`removeChannel`) no cleanup do `useEffect`.**
    2.  **`useMessages.js`:**
        *   Crie uma assinatura para a tabela `messages` filtrando por `conversation_id`.
        *   `supabase.channel(`public:messages:conversation_id=eq.${conversationId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => { ... }).subscribe();`
        *   Atualize o estado `messages`.
        *   **Lembre-se de remover a inscrição (`removeChannel`) no cleanup do `useEffect`.**

## 3. Implementar Atualizações de Status de Conversa/Mensagem

*   **Objetivo:** Marcar conversas como lidas, e mensagens com status de envio/entrega/leitura.
*   **Ações:**
    1.  **`markConversationAsRead(conversationId)` (em `lib/messaging.js`):**
        *   Função para chamar o Supabase para zerar `unread_count` e talvez mudar o `status` para 'read' na tabela `conversations`.
    2.  **Atualização de Status de Mensagem (backend):**
        *   Quando uma mensagem é enviada para uma API externa (via n8n), o callback dessa API deve acionar uma Edge Function no Supabase para atualizar o `status` da mensagem para `sent`, `delivered` ou `read` na tabela `messages`.

## 4. Integração com WhatsApp (Fase 2)

*   **Ver `WHATSAPP_INTEGRATION.md`** para detalhes.
*   **Ações:**
    1.  Ajustar a Edge Function `n8n-webhook` para processar dados reais do WhatsApp via n8n.
    2.  Desenvolver a Edge Function `send-whatsapp-message` para enviar mensagens do frontend para a API do WhatsApp (via n8n).
    3.  Configurar os workflows do n8n conforme o plano.

## 5. Gerenciamento de Canais e Credenciais

*   **Objetivo:** Permitir que clínicas configurem suas próprias integrações de canais.
*   **Ações:**
    1.  Criar uma página de interface de usuário nas Configurações (`/settings/channels`) para gerenciar `channel_credentials`.
    2.  Implementar a lógica de criptografia/descriptografia para as credenciais sensíveis na tabela `channel_credentials`. **(ATENÇÃO: Nunca armazene credenciais sem criptografia)**. Pode-se usar Supabase Vault para isso.

## 6. Melhorias da UI/UX

*   **Scroll Infinito:** Para `ConversationList` e `ChatWindow` para carregar mensagens/conversas antigas sob demanda.
*   **Notificações Sonoras/Visuais:** Para novas mensagens.
*   **Avatares Dinâmicos:** Usar `contact_avatar_url` real se disponível.
*   **Indicadores de Digitação:** (Opcional)

## 7. Testes e Validação

*   **Testes de Integração:** Testar o fluxo completo de mensagens (recebimento e envio) para cada canal integrado.
*   **Testes de Performance:** Garantir que o Realtime e as queries são eficientes sob carga.
*   **Testes de Segurança:** Validar todas as RLS policies.

## 8. Populando o Banco de Dados com Dados de Exemplo

Para facilitar o desenvolvimento e testes, você pode popular seu banco de dados Supabase com dados de exemplo (patients, conversations, messages, templates) usando o script `seedData.js`.

**🚨 AVISO DE SEGURANÇA:** Não execute o script de seed em ambientes de produção ou com dados sensíveis. Ele foi projetado apenas para desenvolvimento e testes.

### O que o Script de Seed Faz?

O script `src/lib/seedData.js` irá:
*   Criar uma clínica de exemplo chamada `"AudiCare Seed Clinic"` (se ainda não existir).
*   Seedear **5 pacientes ficcionais**.
*   Seedear **10 contatos e conversas** distribuídos entre os canais WhatsApp, Instagram e Facebook.
*   Gerar **histórico de mensagens** (mensagens de entrada e saída) para cada conversa, com timestamps e diferentes status (`sent`, `delivered`, `read`).
*   Associar corretamente conversas com contatos e, quando aplicável, contatos com pacientes.
*   Seedear **4 modelos de mensagens** (confirmação de consulta, boas-vindas, retorno, parabéns de aniversário).

### Como Executar o Script de Seed:

Existem duas maneiras principais de executar o script de seed:

#### Método 1: Usando o Botão no Painel de Diagnóstico (Recomendado na UI)

1.  **Acesse o Painel de Diagnóstico:** Navegue até a rota `/health-check` na sua aplicação.
    *   `http://localhost:3000/health-check` (ou a URL do seu ambiente de desenvolvimento).
2.  **Login:** Certifique-se de estar logado na aplicação. O script precisa de um usuário autenticado para associar a clínica criada a um `owner_id`.
3.  **Localize o Botão:** No Painel de Diagnóstico, você encontrará um botão "Popular Banco de Dados".
4.  **Clique para Executar:** Clique neste botão. Você receberá uma confirmação no navegador antes da execução.
5.  **Aguarde a Confirmação:** Após a execução, um alerta no navegador indicará se o processo foi bem-sucedido ou se houve algum erro. O console do navegador também exibirá logs detalhados do processo de seed.

#### Método 2: Via Console do Navegador (Para Debug ou Uso Rápido)

1.  **Abra o Console do Desenvolvedor:** No seu navegador, pressione `F12` (ou `Ctrl+Shift+I` / `Cmd+Option+I`) para abrir as Ferramentas do Desenvolvedor.
2.  **Navegue até a aba "Console".**
3.  **Importe e Execute a Função:** Cole as seguintes linhas no console e pressione Enter: