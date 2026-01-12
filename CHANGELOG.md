# Histórico de Mudanças (Changelog)

## [v1.1.0] - 2025-11-17

### ✨ Adicionado
- **Integração Completa com Supabase:** Todo o módulo de "Caixa de Entrada" foi migrado de dados mockados para uma integração completa com o banco de dados Supabase.
- **Funcionalidade Realtime:** Implementada a funcionalidade de tempo real com Supabase Realtime. Novas conversas e mensagens agora aparecem na UI instantaneamente, sem a necessidade de recarregar a página.
- **Hooks de Dados Reais:** Os hooks `useConversations`, `useMessages`, e `useContactDetails` foram reescritos para buscar dados reais e se inscrever em canais Realtime.
- **API de Dados (`messaging.js`):** Criada uma camada de acesso a dados robusta para todas as interações com as tabelas do Supabase.
- **Migrações de Banco de Dados:** Criados scripts SQL sequenciais (`001` a `004`) para configurar o esquema completo do banco de dados de multicanal, incluindo tabelas, RLS, índices e triggers.
- **Painel de Diagnóstico (`/health-check`):** Adicionada uma nova página para verificar a saúde da conexão com o Supabase (conectividade, RLS, Realtime).
- **Documentação Abrangente:** Criados múltiplos arquivos de documentação (`IMPLEMENTATION_SUMMARY.md`, `KNOWN_ISSUES.md`, `VALIDATION_CHECKLIST.md`, etc.) para detalhar a arquitetura e o processo de desenvolvimento.
- **Loading Skeletons:** Adicionados skeletons de carregamento aos componentes para melhorar a experiência do usuário durante a busca de dados.

### ♻️ Alterado
- **Componentes da Caixa de Entrada:** `ConversationList`, `ChatWindow`, `ContactPanel`, `Inbox` e `ConversationListItem` foram atualizados para consumir dados reais dos novos hooks.
- **`ChatInput`:** A funcionalidade de envio de mensagem agora utiliza a função `sendMessage` do hook `useMessages`, que inclui uma atualização otimista.

### 🐛 Corrigido
- A lista de conversas agora reflete o estado real do banco de dados, em vez de dados estáticos.
- O envio de mensagens agora persiste os dados no Supabase.

---

## [v1.0.0] - (Data Anterior)

### ✨ Adicionado
- Estrutura inicial da UI para a "Caixa de Entrada" com dados mockados.
- Página de "Configuração de Canais" com UI para adicionar credenciais.
- Layout responsivo básico para o módulo de atendimento.
- Criação dos componentes de UI (`Card`, `Button`, `Avatar`, etc.) usando shadcn/ui.