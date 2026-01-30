# Documentação de Templates de Mensagem

Este documento descreve a funcionalidade de gerenciamento e utilização de templates de mensagem no módulo de Atendimento Multicanal.

## Visão Geral

Os templates de mensagem permitem que os agentes respondam de forma rápida e consistente, reutilizando mensagens pré-definidas. Eles serão categorizados, específicos por canal e poderão incluir variáveis dinâmicas.

## 1. Estrutura de Banco de Dados (`message_templates` Tabela)

A tabela `message_templates` armazenará as seguintes informações:

*   **`id`** (uuid, PK): Identificador único do template.
*   **`clinic_id`** (uuid, FK -> `clinics.id`): Clínica à qual o template pertence. Garante o isolamento de dados por clínica via RLS.
*   **`name`** (text, NOT NULL): Nome amigável do template (ex: "Saudação Inicial", "Confirmação de Agendamento").
*   **`content`** (text, NOT NULL): O texto do template. Pode incluir placeholders para variáveis dinâmicas (ex: `Olá {{contact_name}}, sua consulta está agendada para {{appointment_date}}`).
*   **`channel`** (enum: `channel_type`, NOT NULL): O canal para o qual o template é destinado (ex: 'whatsapp', 'instagram', 'facebook'). Um template pode ser específico para um canal ou `general` para todos.
*   **`category`** (text): Categoria opcional para organizar templates (ex: "Agendamento", "Suporte", "Vendas").
*   **`created_at`** (timestamptz, NOT NULL): Carimbo de data/hora da criação do template.
*   **`updated_at`** (timestamptz, NOT NULL): Carimbo de data/hora da última atualização do template.

## 2. Gerenciamento de Templates (UI)

*   **Página de Configurações (`/settings/message-templates`):**
    *   **Listagem:** Exibir todos os templates da clínica, com opções de busca, filtro por canal e categoria.
    *   **Criação/Edição:** Um formulário para criar novos templates ou editar os existentes.
        *   Campos: `name`, `content`, `channel`, `category`.
        *   Um editor de texto que suporte a inclusão de variáveis dinâmicas (sugestões de placeholders).
    *   **Exclusão:** Opção para remover templates.
*   **Permissões:** Apenas usuários com `role='admin'` ou `role='atendimento'` (com permissão específica) devem ter acesso ao gerenciamento de templates.

## 3. Utilização de Templates no `ChatInput.jsx`

O componente `ChatInput.jsx` já possui um `Select` para templates. Esta funcionalidade será aprimorada:

*   **Carregamento Dinâmico:** O `Select` carregará templates da tabela `message_templates` que são `general` ou específicos para o `channel` da conversa atual.
*   **Inserção de Conteúdo:** Ao selecionar um template, seu `content` será inserido no campo de texto do chat.
*   **Preenchimento de Variáveis:**
    *   **Manual:** Inicialmente, o agente será responsável por preencher os placeholders (ex: `{{contact_name}}`).
    *   **Automático (Futuro):** Com a evolução, o sistema poderá preencher automaticamente variáveis comuns como `{{contact_name}}`, `{{clinic_name}}`, `{{user_name}}` usando dados do `contact` e do `profile` logado. Variáveis mais complexas (ex: `{{appointment_date}}`) podem requerer integração com o painel do contato ou um mini-formulário.

## 4. RLS e Segurança

*   **`message_templates`:** As políticas de RLS garantirão que cada clínica só possa visualizar, criar, editar ou excluir seus próprios templates (`clinic_id = auth.user_clinic_id()`).

## 5. Próximas Etapas

*   Implementar a página de gerenciamento de templates nas configurações.
*   Conectar o `ChatInput.jsx` ao backend para carregar e utilizar templates reais.
*   Desenvolver a lógica para preenchimento (manual e futuro automático) de variáveis nos templates.