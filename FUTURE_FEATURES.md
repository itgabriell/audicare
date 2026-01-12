# Funcionalidades Futuras do Módulo de Atendimento Multicanal

Este documento descreve as funcionalidades planejadas para o módulo de Caixa de Entrada, com foco em como estender o sistema atual e as considerações de implementação.

## 1. Adicionar Novos Canais (Ex: Telegram, E-mail, Webchat)

A arquitetura atual foi projetada para ser extensível a novos canais.

### Fluxo para Adição de um Novo Canal (Ex: Telegram)

1.  **Integração com n8n:**
    *   Configure um novo nó no n8n para interagir com a API do Telegram (recebimento e envio).
    *   Crie um workflow n8n para receber mensagens do Telegram e formatá-las no padrão esperado pela `n8n-webhook` Edge Function.
    *   Crie um workflow n8n para receber mensagens da `send-whatsapp-message` (ou uma nova `send-multichannel-message`) Edge Function e enviá-las para o Telegram.
2.  **Supabase:**
    *   **Tabela `channels` (sugerida na auditoria):** Se ainda não existir, crie uma tabela `channels` para configurar os detalhes de cada canal por clínica (ex: token do bot do Telegram).
    *   **`contacts` / `conversations` / `messages`:** O esquema atual é genérico o suficiente para acomodar novos canais. O campo `channel` ou `channel_id` (se implementado) nas tabelas `conversations` e `messages` indicará a origem.
    *   **RLS:** As políticas de RLS existentes para `clinic_id` continuarão a garantir o isolamento dos dados.
3.  **Frontend:**
    *   **`ChannelBadge.jsx`:** Adicione o ícone e o nome para o novo canal no mapeamento do `ChannelBadge`.
    *   **`ConversationList.jsx`:** Adicione um novo botão de filtro de canal.
    *   **Lógica de Renderização:** O `Inbox.jsx` e `ChatWindow.jsx` já são genéricos. A lógica para enviar mensagens no `useMessages` precisará ser adaptada para rotear para o canal correto (provavelmente via uma Edge Function mais genérica).

## 2. Estender o Painel Lateral (`RightPanel.jsx`)

O `RightPanel.jsx` é o hub de contexto do cliente. Ele pode ser expandido para incluir:

*   **Histórico de Compras/Serviços:** Integrar com o módulo financeiro para exibir compras anteriores, planos, etc.
*   **Informações do Paciente (`patients`):**
    *   Se o `contact` estiver vinculado a um `patient` (via `contact_relationships`), exibir informações detalhadas do paciente: prontuários, resultados de exames, aparelhos auditivos registrados.
    *   Botão para "Ver Prontuário Completo".
*   **Tags e Categorias de Conversa:**
    *   Permitir adicionar tags a conversas (ex: "Lead Novo", "Suporte Técnico", "Reclamação").
    *   Tabela `conversation_tags` para gerenciar.
*   **Notas da Conversa:**
    *   Um campo de texto para o agente adicionar anotações internas sobre a conversa ou o contato.
*   **Atribuição de Agente:**
    *   Um seletor para atribuir a conversa a outro agente da clínica. (Requer `conversation_assignments` ou campo `assigned_to_user_id` em `conversations`).
    *   Exibir o agente atualmente responsável pela conversa.

### Como Estender

1.  **Dados:** Modifique o `useMessages` ou crie um novo hook (`useContactDetails`) para buscar as informações adicionais necessárias (histórico de compras, dados de paciente, tags).
2.  **UI:** Adicione novos componentes ou seções ao `RightPanel.jsx`, utilizando os componentes de UI (`Card`, `Separator`, etc.) do shadcn/ui.
3.  **Interatividade:** Implemente a lógica para adicionar/editar tags, salvar notas e atribuir agentes, chamando funções do Supabase.

## 3. Adicionar Templates de Mensagem

Templates de mensagem são cruciais para a eficiência do atendimento.

### Como Adicionar Templates

1.  **Estrutura de Dados:**
    *   Tabela `message_templates` no Supabase: `id`, `clinic_id`, `name`, `content` (com placeholders como `{{nome_contato}}`), `category` (opcional).
2.  **Gerenciamento (CRUD):**
    *   Criar uma página ou modal de gerenciamento de templates (ex: em `pages/Settings` ou em um novo `pages/Templates`).
    *   Permitir que administradores ou atendentes com permissão criem, editem e excluam templates.
3.  **Integração no `ChatInput.jsx`:**
    *   Adicione um botão ao lado do `Textarea` no `ChatInput.jsx` para abrir um seletor de templates.
    *   O seletor deve listar os templates disponíveis para a clínica.
    *   Ao selecionar um template, o conteúdo deve ser inserido no `Textarea`.
    *   **Substituição de Variáveis:** Implemente uma função no frontend que substitua placeholders (ex: `{{contact_name}}`) por valores reais do contato (`conversation.contact.name`).

## 4. Integração de Agendamentos

Integrar a funcionalidade de agendamento diretamente na Caixa de Entrada.

### Como Integrar Agendamentos

1.  **API Existente:** O sistema já possui tabelas e lógica para `appointments` e `patients`.
2.  **`RightPanel.jsx`:**
    *   Modifique a seção "Histórico de Agendamentos" para buscar e exibir agendamentos reais do `contact` (se houver um `patient_id` associado ou se o `phone`/`email` do contato corresponder a um paciente).
    *   Utilize a função `get_appointments_for_clinic` no Supabase (se acessível) ou uma nova RPC para buscar agendamentos.
    *   O botão "Novo Agendamento" no `RightPanel.jsx` deve abrir um modal de criação de agendamento (reutilizando um componente de `Appointments` ou criando um novo), pré-preenchido com os dados do contato.
3.  **Notificações:**
    *   Automatizar o envio de confirmações e lembretes de agendamento via WhatsApp (ou outro canal) após a criação ou atualização de um agendamento. Isso envolveria integração com workflows n8n.