# Arquitetura do Módulo de Caixa de Entrada (Inbox)

Este documento descreve a estrutura de componentes e o fluxo de dados para o módulo de Atendimento Multicanal.

## 1. Visão Geral

O módulo é projetado em um layout de três colunas para maximizar a produtividade do agente, permitindo visualizar a lista de conversas, interagir com um cliente e ver o contexto do cliente simultaneamente.

-   **Coluna Esquerda:** Lista de conversas, com filtros e busca.
-   **Coluna Central:** Janela de chat da conversa selecionada.
-   **Coluna Direita:** Painel de contexto com informações do contato/paciente.

## 2. Estrutura de Componentes

### Página Principal
-   **`pages/Inbox.jsx`**
    -   **Responsabilidade:** Orquestrar o layout principal de três colunas. Gerencia o estado da conversa selecionada (`selectedConversationId`).
    -   **Hooks:** Utiliza `useConversations` para obter a lista de conversas e `useMessages` para as mensagens da conversa ativa.
    -   **Lógica:** Passa os dados para os componentes filhos e gerencia a seleção de conversas, incluindo a marcação de mensagens como lidas.

### Coluna Esquerda
-   **`components/inbox/ConversationList.jsx`**
    -   **Responsabilidade:** Exibir a lista de conversas e fornecer controles de filtragem.
    -   **Funcionalidades:**
        -   Barra de busca para filtrar por nome ou telefone.
        -   Filtros pré-definidos (Todos, Não Lidos).
        -   Filtros por canal (WhatsApp, Instagram, etc.).
    -   **Componentes Filhos:** `ConversationListItem.jsx`.

-   **`components/inbox/ConversationListItem.jsx`**
    -   **Responsabilidade:** Renderizar um único item na lista de conversas.
    -   **Funcionalidades:**
        -   Exibe o avatar, nome do contato e a última mensagem.
        -   Mostra um indicador de mensagens não lidas (`Badge`).
        -   Exibe o tempo da última mensagem.
        -   Utiliza `ChannelBadge.jsx` para mostrar o ícone do canal.

### Coluna Central
-   **`components/inbox/ChatWindow.jsx`**
    -   **Responsabilidade:** Exibir o histórico de mensagens da conversa selecionada e permitir o envio de novas mensagens.
    -   **Componentes Filhos:**
        -   `ChatMessage.jsx` (Message Bubble).
        -   `ChatInput.jsx`.

-   **`components/inbox/ChatMessage.jsx`**
    -   **Responsabilidade:** Renderizar uma única "bolha" de mensagem.
    -   **Funcionalidades:**
        -   Diferencia visualmente as mensagens do usuário e do contato.
        -   Exibe o conteúdo da mensagem e o horário.
        -   Mostra o status da mensagem (enviando, enviado, entregue, lido) com ícones e tooltips.

-   **`components/inbox/ChatInput.jsx`**
    -   **Responsabilidade:** Fornecer a área de texto e o botão para enviar mensagens.
    -   **Funcionalidades:**
        -   Campo de texto que se expande automaticamente.
        -   Botão de envio com estado de "carregando".
        -   (Futuro) Botões para anexos e templates.

### Coluna Direita
-   **`components/inbox/RightPanel.jsx`**
    -   **Responsabilidade:** Exibir informações contextuais sobre o contato da conversa ativa.
    -   **Funcionalidades:**
        -   **Dados do Contato:** Mostra nome, telefone, email e tags.
        -   **Histórico de Agendamentos:** (Estrutura preparada) Lista os agendamentos passados e futuros do paciente associado.
        -   **Ações Rápidas:** (Estrutura preparada) Botões para "Novo Agendamento", "Enviar Template", etc.

### Componentes Reutilizáveis
-   **`components/inbox/ChannelBadge.jsx`**
    -   **Responsabilidade:** Renderizar um ícone e nome de canal (ex: WhatsApp). Usado em `ConversationListItem` e `RightPanel`.

## 3. Gerenciamento de Estado (Hooks)

-   **`hooks/useConversations.js`**
    -   Busca e gerencia a lista de conversas da clínica.
    -   Inscreve-se em eventos de tempo real (Realtime) para atualizar a lista quando novas mensagens chegam ou conversas são atualizadas.

-   **`hooks/useMessages.js`**
    -   Busca e gerencia as mensagens de uma `conversationId` específica.
    -   Inscreve-se em eventos de tempo real para adicionar novas mensagens ao chat.
    -   Contém a lógica para envio de mensagens (chamada à API), incluindo a atualização otimista na UI.

Este design modular permite que cada parte da Caixa de Entrada seja desenvolvida e mantida de forma independente, garantindo uma base sólida para futuras expansões.