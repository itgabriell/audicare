# Roteiro de Integração do Atendimento Multicanal

Este roteiro descreve as fases de implementação para a construção completa do módulo de Atendimento Multicanal, detalhando as integrações e funcionalidades a serem desenvolvidas.

## Fase 1: Estrutura Base (Concluída)

**Objetivo:** Estabelecer a base da UI, gerenciamento de estado e estrutura de dados para o módulo de caixa de entrada.

**Entregas:**
*   **`Inbox.jsx`**: Página principal com layout de 3 colunas (lista de conversas, chat, painel do contato).
*   **`ConversationList.jsx`**: Componente para listar conversas, com filtros básicos (canal, status) e busca.
*   **`ChatWindow.jsx`**: Componente para exibir e interagir com o histórico de mensagens.
*   **`ContactPanel.jsx`**: Componente para exibir detalhes do contato e informações relacionadas (paciente, agendamentos).
*   **`ChatInput.jsx`**: Componente para entrada de texto e seleção de templates.
*   **`useConversations.js`**: Hook para gerenciar o estado da lista de conversas.
*   **`useMessages.js`**: Hook para gerenciar o estado das mensagens de uma conversa.
*   **`useContactDetails.js`**: Hook para gerenciar o estado dos detalhes do contato.
*   **`lib/messaging.js`**: Funções auxiliares para interação com o backend (mockadas inicialmente).
*   **Estrutura de Banco de Dados (`MULTICHANNEL_TABLES_PLAN.md`):** Definição das tabelas `conversations`, `messages`, `contacts`, `channel_credentials`, `message_templates`, `contact_patients`, `conversation_assignments`, com RLS, índices e triggers.

---

## Fase 2: Integração WhatsApp (Próxima)

**Objetivo:** Habilitar o envio e recebimento de mensagens via WhatsApp, integrando com um provedor de API (ex: Z-API, Twilio, Meta Business API).

**Detalhes da Implementação:** Ver `WHATSAPP_INTEGRATION.md`

---

## Fase 3: Integração Instagram (A Seguir)

**Objetivo:** Permitir a gestão de interações diretas (DMs) do Instagram dentro da caixa de entrada.

**Detalhes da Implementação:** Ver `INSTAGRAM_INTEGRATION.md`

---

## Fase 4: Integração Facebook Messenger (Futura)

**Objetivo:** Incorporar as mensagens do Facebook Messenger ao fluxo de atendimento unificado.

**Detalhes da Implementação:** Ver `FACEBOOK_INTEGRATION.md`

---

## Fase 5: Templates de Mensagem Avançados

**Objetivo:** Implementar o gerenciamento completo e a utilização de templates de mensagem dinâmicos e específicos por canal.

**Detalhes da Implementação:** Ver `MESSAGE_TEMPLATES.md`

---

## Fase 6: Agendamentos Integrados

**Objetivo:** Permitir a criação e gestão de agendamentos diretamente do chat, com sincronização com o módulo de Agenda.

**Detalhes da Implementação:** Ver `APPOINTMENTS_INTEGRATION.md`

---

## Fase 7: Automações e IA

**Objetivo:** Adicionar recursos de automação (bots, respostas automáticas) e inteligência artificial (sugestões de resposta, análise de sentimento) para otimizar o atendimento.

**Detalhes da Implementação:**
*   **Integração com Ferramentas de Automação:** Conectar a caixa de entrada a plataformas como n8n, Zapier ou workflows customizados para disparar ações com base em eventos de chat (ex: nova mensagem, palavra-chave detectada).
*   **Chatbots/IA Generativa:** Desenvolver ou integrar chatbots para atendimento inicial, perguntas frequentes e triagem. Implementar IA para sugerir respostas ao agente humano com base no contexto da conversa.
*   **Análise de Sentimento:** Utilizar IA para identificar o tom da conversa e priorizar atendimentos urgentes.
*   **Respostas Rápidas Sugeridas:** Ferramentas que sugerem snippets de texto para o agente, agilizando o atendimento.

---

## Próximas Etapas

Consultar `DEVELOPMENT_GUIDE.md` para instruções detalhadas sobre como iniciar a implementação das próximas fases.