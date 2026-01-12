# Roadmap do Módulo de Atendimento Multicanal

Este documento descreve as fases de implementação para o módulo de Atendimento Multicanal (Caixa de Entrada), desde sua estrutura inicial até integrações avançadas.

## Fase 1: Estrutura Visual e Preparação (Concluída - Layout Inicial)

**Objetivo:** Estabelecer a interface do usuário base e a estrutura de dados inicial para a Caixa de Entrada.

*   **1.1. Layout de 3 Colunas:** Implementar `Inbox.jsx` com a divisão visual para lista de conversas, chat e painel lateral de detalhes.
*   **1.2. Lista de Conversas (`ConversationList.jsx`):** Exibir conversas com nome do contato, última mensagem, timestamp e indicadores de não lido. Implementar filtros básicos (todos/não lidos) e campo de busca.
*   **1.3. Chat (`ChatWindow.jsx`):** Exibir mensagens de uma conversa selecionada, com "bolhas" diferenciadas para remetente/destinatário e status de envio.
*   **1.4. Painel Lateral (`RightPanel.jsx`):** Mostrar informações básicas do contato e preparar seções para futuras funcionalidades (agendamentos, histórico, etc.).
*   **1.5. Componentes Reutilizáveis:**
    *   `ChannelBadge.jsx`: Identificador visual para o canal da conversa.
    *   `ChatMessage.jsx`: Componente de "bolha" de mensagem com status.
*   **1.6. Hooks de Dados:** Utilizar `useConversations` e `useMessages` para gerenciamento de estado e tempo real.
*   **1.7. Responsividade:** Garantir que o layout se adapte bem a diferentes tamanhos de tela (desktop, tablet, mobile).

## Fase 2: Integração WhatsApp via n8n (Próxima)

**Objetivo:** Habilitar o envio e recebimento de mensagens do WhatsApp através do sistema, usando o n8n como orquestrador.

*   **2.1. Configuração de Webhook (Supabase Edge Function):**
    *   Desenvolver ou adaptar a `n8n-webhook` Edge Function para receber eventos do n8n (mensagens de entrada, status de entrega).
    *   Garantir que a função `handle_incoming_message` no PostgreSQL seja invocada corretamente para criar/atualizar contatos, conversas e mensagens.
*   **2.2. Workflow n8n (Recebimento):**
    *   Criar ou configurar um workflow no n8n que receba mensagens do provedor de WhatsApp (ex: Z-API, Manychat).
    *   Normalizar o payload e enviar a mensagem para a `n8n-webhook` Edge Function do Supabase.
*   **2.3. Envio de Mensagens (Frontend -> n8n -> WhatsApp):**
    *   Adaptar `sendMessage` em `useMessages` para chamar uma Edge Function de saída (ex: `send-zapi-message`).
    *   Criar uma Edge Function que receba a mensagem do frontend, formate-a e a envie para o workflow n8n apropriado para despacho via WhatsApp.
    *   Configurar o workflow n8n para receber a mensagem e enviá-la para a API do WhatsApp.
*   **2.4. Status de Entrega:**
    *   Atualizar a tabela `messages` com status de `sent`, `delivered`, `read` baseados nos webhooks do provedor de WhatsApp via n8n.
    *   Refletir esses status no `ChatMessage.jsx`.

## Fase 3: Integração Instagram e Facebook (Futura)

**Objetivo:** Estender o suporte multicanal para incluir Instagram Direct e Facebook Messenger.

*   **3.1. Adaptação do Webhook Central:** Aprimorar a `n8n-webhook` para identificar e processar mensagens de diferentes canais.
*   **3.2. Workflows n8n Específicos:** Criar workflows n8n dedicados para a integração com as APIs do Instagram e Facebook.
*   **3.3. Normalização de Dados:** Garantir que os dados de mensagens e contatos de Instagram e Facebook sejam mapeados corretamente para o esquema do Supabase.
*   **3.4. Indicadores de Canal:** Utilizar `ChannelBadge.jsx` de forma consistente para identificar a origem de cada conversa.

## Fase 4: Templates de Mensagem (Futura)

**Objetivo:** Permitir que agentes utilizem modelos de mensagem pré-definidos para respostas rápidas e padronizadas.

*   **4.1. Gerenciamento de Templates:**
    *   Interface para criar, editar e excluir templates.
    *   Tabela `message_templates` no banco de dados.
*   **4.2. Inserção no Chat:**
    *   Componente no `ChatInput.jsx` para selecionar e inserir templates na caixa de texto.
    *   Suporte a variáveis dinâmicas nos templates (ex: `{{contact_name}}`).

## Fase 5: Agendamentos Integrados (Futura)

**Objetivo:** Facilitar a criação e visualização de agendamentos diretamente da Caixa de Entrada.

*   **5.1. Visualização no `RightPanel.jsx`:** Exibir o histórico de agendamentos do contato/paciente no painel lateral.
*   **5.2. Ações Rápidas (`RightPanel.jsx`):** Botão "Novo Agendamento" que abre um modal pré-preenchido com os dados do contato.
*   **5.3. Confirmações Automáticas:** Envio automático de lembretes e confirmações de agendamento via canais de mensagens.

## Fase 6: Automações e Inteligência Artificial (Avançada)

**Objetivo:** Implementar automações inteligentes e recursos de IA para otimizar o atendimento.

*   **6.1. Respostas Automáticas:** Configuração de respostas automáticas baseadas em palavras-chave ou horários de atendimento.
*   **6.2. Chatbots Simples:** Integração com chatbots para responder perguntas frequentes.
*   **6.3. Análise de Sentimento:** Ferramentas de IA para analisar o sentimento das conversas e priorizar atendimentos.
*   **6.4. Sugestões de Resposta:** IA sugerindo respostas para os agentes.
*   **6.5. Roteamento Inteligente:** Atribuir conversas a agentes específicos com base em regras ou IA.