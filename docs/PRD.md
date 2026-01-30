# Documento de Requisitos do Produto (PRD) - Audicare

## 1. Introdução

### 1.1 Visão do Produto
O **Audicare** é um Sistema de Gestão de Clínicas (CMS) focado em audiologia, projetado para centralizar e otimizar todas as operações de uma clínica auditiva. Ele integra gestão de pacientes, agendamentos, CRM (vendas e leads), marketing (redes sociais e e-mail), finanças e atendimento multicanal (WhatsApp/Chatwoot) em uma única plataforma intuitiva e moderna.

### 1.2 Público-Alvo
*   **Fonoaudiólogos:** Para gestão clínica, registros de audiometria e acompanhamento de pacientes.
*   **Recepcionistas/Secretárias:** Para agendamento, atendimento via chat unificado e cadastro de pacientes.
*   **Gestores/Donos de Clínica:** Para visão geral do negócio, relatórios financeiros e monitoramento de desempenho (KPIs).
*   **Equipe de Vendas/Marketing:** Para gestão de leads (CRM), campanhas de e-mail e automações.

## 2. Personas de Usuário

*   **Dra. Ana (Fonoaudióloga):** Precisa acessar rapidamente o histórico do paciente, registrar exames de audiometria, gerar laudos e prescrições. Valoriza a facilidade de uso durante a consulta.
*   **Julia (Recepcionista):** Precisa de uma agenda ágil, ver confirmações de consulta automaticamente e responder mensagens de WhatsApp/Instagram em uma única tela sem trocar de aba.
*   **Roberto (Gestor):** Foca no Dashboard financeiro, taxas de conversão de leads e eficiência da equipe. Precisa de relatórios claros para tomada de decisão.

## 3. Requisitos Funcionais

### 3.1 Painel de Controle (Dashboard)
*   **Visão Geral:** Exibir métricas chave (KPIs) como total de atendimentos dia/mês, faturamento, novos leads e tarefas pendentes.
*   **Notificações:** Alertas de sistema, lembretes de tarefas e mensagens não lidas.
*   **Acesso Rápido:** Atalhos para funções frequentes (Novo Agendamento, Novo Paciente).

### 3.2 Gestão de Pacientes (`/patients`) e Atendimento (`/care`)
*   **Cadastro Completo:** Dados pessoais, contato, endereço e tags personalizáveis.
*   **Prontuário Eletrônico:** Histórico de consultas, exames e anotações clínicas.
*   **Importação/Exportação:** Capacidade de importar pacientes via CSV e exportar dados.
*   **Jornada do Paciente:** Visualização gráfica do status do paciente (Novo, Em Teste, Adaptado, etc.).
*   **Geração de Documentos:** Criação automática de atestados, laudos e receitas baseados em templates.

### 3.3 Agenda e Agendamentos (`/appointments`)
*   **Calendário Interativo:** Visualização por dia, semana e mês.
*   **Gestão de Status:** Agendado, Confirmado, Em Atendimento, Finalizado, Cancelado.
*   **Lembretes Automáticos:** Envio de confirmações via WhatsApp/SMS (integração).
*   **Filtros:** Por profissional, sala ou tipo de consulta.

### 3.4 CRM e Vendas (`/crm`)
*   **Funil de Vendas (Kanban):** Gestão visual de leads em estágios (Novo, Contato, Agendado, Venda, Perda).
*   **AI Trainer:** Componente para treinamento de equipe ou IA auxiliar em vendas.
*   **Gestão de Leads:** Cadastro e rastreamento de origem de leads.

### 3.5 Inbox Unificado (`/inbox`)
*   **Integração Chatwoot:** Centralização de mensagens de WhatsApp, Instagram e Webchat.
*   **Vínculo com Paciente:** Identificação automática do paciente pelo número de telefone.
*   **Agendamento Rápido:** Criar agendamentos diretamente da tela de chat.
*   **Histórico de Conversas:** Acesso ao histórico completo de interações.

### 3.6 Marketing e Automação
*   **Campanhas de E-mail (`/email-campaigns`):** Criação e disparo de e-mails marketing.
*   **Redes Sociais (`/social-media`):** Gestão e agendamento de posts.
*   **Automações (`/automations`):** Regras para envio de mensagens automáticas (aniversário, retorno, etc.).

### 3.7 Gestão de Reparos (`/repairs`)
*   **Controle de Aparelhos:** Rastreamento de aparelhos auditivos enviados para conserto.
*   **Kanban de Status:** Visualização do fluxo (Recebido, Em Análise, Enviado ao Lab, Pronto, Entregue).

### 3.8 Financeiro (`/invoices`)
*   **Faturamento:** Emissão e controle de faturas/recibos.
*   **Relatórios:** Visão de receitas e despesas.

### 3.9 Configurações (`/settings`)
*   **Perfil:** Dados do usuário logado.
*   **Clínica:** Configurações gerais da empresa.
*   **Canais e Integrações:** Configuração de WhatsApp (Uazapi/Z-API), E-mail (SMTP), etc.
*   **Segurança:** Gestão de senhas e acessos.

## 4. Requisitos Não-Funcionais

*   **Responsividade:** O sistema deve funcionar perfeitamente em Desktops, Tablets e Smartphones (foco em Mobile-First para recepção/médicos em trânsito).
*   **Performance:** Carregamento rápido de páginas (Lazy Loading já implementado) e otimização de queries no banco de dados.
*   **Segurança:** Autenticação robusta (Supabase Auth), controle de acesso baseado em função (RBAC) e proteção de dados sensíveis (LGPD).
*   **Disponibilidade:** Arquitetura resiliente para garantir alta disponibilidade durante horário comercial.
*   **Usabilidade:** Interface limpa, moderna e intuitiva (UI/UX), com suporte a temas (Dark/Light Mode).
*   **Escalabilidade:** Estrutura modular (Services) pronta para crescimento e novas features.

## 5. Arquitetura Técnica
*   **Frontend:** React (Vite) + Tailwind CSS + ShadcnUI.
*   **Backend/BaaS:** Supabase (Auth, Database, Storage, Edge Functions).
*   **Hospedagem:** Vercel (Frontend).
*   **Integrações Externas:** Chatwoot (Atendimento), n8n (Automação), APIs de WhatsApp.
