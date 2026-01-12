# AudiCare Clinic System - Módulo de Atendimento Multicanal

Este documento complementa o `README.md` principal, focando especificamente no módulo de Atendimento Multicanal do AudiCare Clinic System.

## Visão Geral do Módulo

O módulo de Atendimento Multicanal é o coração da comunicação com os clientes, permitindo que as clínicas gerenciem todas as interações em uma única interface. Ele integra diferentes canais de comunicação para oferecer uma experiência de atendimento unificada e eficiente.

### Funcionalidades Principais:

*   **Caixa de Entrada Unificada:** Visualize e responda a mensagens de diferentes canais (WhatsApp, Instagram, Facebook) em tempo real.
*   **Lista de Conversas:** Filtre, busque e organize suas conversas por canal, status e contato.
*   **Chat em Tempo Real:** Troque mensagens com clientes, com histórico completo, timestamps e avatares.
*   **Painel do Contato:** Acesse rapidamente informações detalhadas do cliente, histórico de interações e agendamentos relacionados.
*   **Templates de Mensagem:** Utilize respostas pré-definidas para agilizar o atendimento.
*   **Configuração de Canais:** Conecte e gerencie suas contas de WhatsApp, Instagram e Facebook através de um painel de configurações intuitivo.

## Estrutura do Banco de Dados para Multicanal

O backend é totalmente construído sobre o Supabase, utilizando seu banco de dados PostgreSQL, Autenticação, Edge Functions e Realtime. A estrutura para o módulo multicanal é centrada nas seguintes tabelas principais:

*   **`clinics`**: Informações da clínica.
*   **`profiles`**: Perfil dos usuários (equipe da clínica) e sua associação com a `clinic_id`.
*   **`contacts`**: Informações dos clientes/contatos, incluindo nome, telefone, e-mail e `channel_type` (ex: 'whatsapp', 'instagram').
*   **`contact_relationships`**: Tabela pivot para ligar `contacts` a outras entidades como `patients`.
*   **`conversations`**: Representa uma conversa contínua com um `contact` específico, incluindo `clinic_id`, `contact_id`, `last_message_at`, `unread_count` e `status`.
*   **`messages`**: Armazena as mensagens individuais de cada conversa, com `clinic_id`, `conversation_id`, `sender_type` (user/contact), `content`, `status`, `created_at`.
*   **`message_templates`**: Modelos de mensagens pré-definidas para automação e agilidade no atendimento.
*   **`appointments`**: Agendamentos, que podem ser vinculados a `patients` e, indiretamente, a `contacts`.

### Segurança (RLS)

A arquitetura é multi-tenant, garantindo o isolamento total dos dados de cada clínica através de políticas de Row-Level Security (RLS) implementadas para todas as tabelas relevantes (`contacts`, `conversations`, `messages`, `appointments`, etc.).

### Documentação Detalhada:

*   Para uma visão completa da arquitetura do banco de dados, consulte **[CURRENT_DATABASE_STRUCTURE.md](CURRENT_DATABASE_STRUCTURE.md)**.
*   Para detalhes específicos sobre a modelagem de dados para o módulo multicanal, consulte **[MULTICHANNEL_TABLES_PLAN.md](MULTICHANNEL_TABLES_PLAN.md)**.
*   Para instruções sobre como configurar o banco de dados do zero, veja **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**.
*   Para detalhes sobre as funções da API que interagem com o banco, consulte **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**.

---

## 🚀 Quick Start com Dados de Exemplo

Para você começar a explorar o módulo de Atendimento Multicanal imediatamente, sem a necessidade de criar dados manualmente, oferecemos um script de **seed data** completo!

**O que você verá:** Ao popular o banco de dados, sua "Caixa de Entrada" no `/inbox` será preenchida com uma lista de conversas ativas. Cada conversa terá um contato com nome e telefone (ou ID de canal), um ícone representando o canal (WhatsApp, Instagram, Facebook), e um histórico de mensagens realistas entre o contato e a "clínica". O painel lateral mostrará os detalhes do contato e, para alguns, até um paciente associado com agendamentos de exemplo.

### Como Popular o Banco de Dados:

**Opção Rápida (Recomendada para Desenvolvimento):**

1.  **Inicie a Aplicação** (`npm run dev`).
2.  **Autentique-se** com qualquer conta de usuário.
3.  **Acesse o Painel de Diagnóstico:** Vá para `http://localhost:3000/health-check` no seu navegador.
4.  **Clique no Botão:** Localize o botão "**Popular Banco de Dados**" e clique nele. Confirme a ação.

Uma vez concluído, você pode navegar para a página `/inbox` e explorar as conversas, contatos e mensagens que foram criadas automaticamente!

**Dados Populados:** O script criará uma clínica de exemplo ("AudiCare Seed Clinic"), 5 pacientes, 10 contatos e conversas distribuídas entre WhatsApp, Instagram e Facebook, com histórico de mensagens e status realistas. Ele também adicionará 4 modelos de mensagens úteis.

**🚨 ATENÇÃO:** Este script é **idempotente** (seguro para rodar múltiplas vezes sem criar duplicatas da clínica e dados principais) e **SOMENTE PARA DESENVOLVIMENTO**. Nunca execute em ambientes de produção.

Para instruções mais detalhadas sobre como executar, verificar, ou solucionar problemas com os dados de exemplo, consulte o guia completo: **[SEED_DATA_GUIDE.md](docs/SEED_DATA_GUIDE.md)**.

---

## Próximos Passos (Desenvolvimento)

Com os dados de exemplo no lugar, você está pronto para mergulhar no desenvolvimento! Para entender as próximas etapas e as funcionalidades a serem implementadas no módulo Multicanal, consulte:

*   **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)**: Para detalhes sobre a integração com Supabase Realtime, APIs de mensagens, e mais.

---