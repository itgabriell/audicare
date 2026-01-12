# AudiCare Clinic System

Bem-vindo ao AudiCare Clinic System, um sistema de gestão completo para clínicas de audiologia, com um foco robusto em atendimento multicanal.

## Visão Geral do Projeto

O AudiCare é uma aplicação web moderna construída com **React**, **Vite**, **TailwindCSS** e **Supabase**. Ele oferece funcionalidades essenciais para a gestão de clínicas, incluindo:

*   **Dashboard:** Visão geral das métricas e atividades importantes.
*   **Pacientes:** Gerenciamento completo de prontuários e informações de pacientes.
*   **Agendamentos:** Controle de agenda e compromissos.
*   **CRM:** Gestão de leads e relacionamento com clientes.
*   **Tarefas:** Organização e acompanhamento de atividades internas.
*   **Reparos:** Gerenciamento de dispositivos e serviços de reparo.
*   **Atendimento Multicanal (Caixa de Entrada):** Um módulo centralizado para gerenciar conversas de diversos canais (WhatsApp, Instagram, Facebook) em um só lugar.
*   **Usuários:** Gerenciamento de perfis e permissões de acesso.
*   **Configurações:** Personalização do sistema e integração com serviços externos.

## Módulo de Atendimento Multicanal

O módulo de Atendimento Multicanal é o coração da comunicação com os clientes, permitindo que as clínicas gerenciem todas as interações em uma única interface.

### Funcionalidades Principais:

*   **Caixa de Entrada Unificada:** Visualize e responda a mensagens de diferentes canais em tempo real.
*   **Lista de Conversas:** Filtre, busque e organize suas conversas por canal, status e contato.
*   **Chat em Tempo Real:** Troque mensagens com clientes, com histórico completo, timestamps e avatares.
*   **Painel do Contato:** Acesse rapidamente informações detalhadas do cliente, histórico de interações e agendamentos relacionados.
*   **Templates de Mensagem:** Utilize respostas pré-definidas para agilizar o atendimento.
*   **Configuração de Canais:** Conecte e gerencie suas contas de WhatsApp, Instagram e Facebook através de um painel de configurações intuitivo.

## Estrutura do Banco de Dados

O backend é totalmente construído sobre o Supabase, utilizando seu banco de dados PostgreSQL, Autenticação, Edge Functions e Realtime.

*   **Segurança:** A arquitetura é multi-tenant, garantindo o isolamento total dos dados de cada clínica através de políticas de Row-Level Security (RLS).
*   **Escalabilidade:** A estrutura de dados foi projetada para ser escalável, com tabelas como `channels`, `contacts`, `conversations` e `messages` formando o núcleo do sistema de atendimento.
*   **Documentação Detalhada:**
    *   Para uma visão completa da arquitetura do banco de dados, consulte **[CURRENT_DATABASE_STRUCTURE.md](CURRENT_DATABASE_STRUCTURE.md)**.
    *   Para instruções sobre como configurar o banco de dados do zero, veja **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**.
    *   Para detalhes sobre as funções da API que interagem com o banco, consulte **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**.

## Como Começar

1.  **Clone o repositório:**