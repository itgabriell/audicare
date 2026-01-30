# Guia Detalhado de Solução de Problemas (Troubleshooting)

**Data:** 17 de Novembro de 2025

Este guia oferece soluções para problemas comuns que podem ocorrer durante o desenvolvimento, deploy e uso da aplicação AudiCare, com foco especial na integração com o Supabase e nas funcionalidades de atendimento multicanal.

## 1. Ativação de Logs para Debugging

Antes de qualquer coisa, certifique-se de que o console do seu navegador e os logs do Supabase estão abertos e monitorados.

*   **No Frontend (Navegador):** Abra as Ferramentas do Desenvolvedor (F12 ou Ctrl+Shift+I) e vá para a aba `Console`. Nossas funções em `messaging.js` e hooks (`useConversations`, `useMessages`, etc.) já incluem `console.error` para capturar falhas.
*   **No Supabase:**
    *   **Logs de Edge Functions:** No painel do Supabase, vá para **Edge Functions -> Logs**. Selecione a Edge Function relevante (ex: `n8n-webhook`, `send-whatsapp-message`) para ver os logs de execução.
    *   **Logs de Banco de Dados (Postgres):** Vá para **Reports -> Database Health** e procure por logs de erro ou queries lentas.
    *   **Logs de Autenticação:** Vá para **Authentication -> Logs** para depurar problemas de login.

## 2. Erro de Conexão com Supabase (Frontend)

**Sintomas:** A aplicação não carrega dados, exibe erros de rede no console, ou o "Health Check Panel" falha na "Conexão com Supabase".

**Possíveis Causas e Soluções:**

*   **Variáveis de Ambiente Incorretas:**
    *   **Verificação:** Verifique o arquivo `.env.local` (local) ou as variáveis de ambiente do seu ambiente de deploy.
    *   **Solução:** Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` correspondem exatamente aos valores em **Project Settings -> API** do seu projeto Supabase.
*   **Problemas de Rede:**
    *   **Verificação:** Tente acessar `https://[SEU_SUPABASE_URL]/rest/v1/` diretamente no navegador. Se não carregar, pode ser um problema de rede local ou de status do serviço Supabase.
    *   **Solução:** Verifique sua conexão de internet. Consulte a página de status do Supabase.
*   **Firewall/Proxy:**
    *   **Verificação:** Se você estiver em uma rede corporativa, um firewall ou proxy pode estar bloqueando a conexão.
    *   **Solução:** Tente em outra rede ou configure o proxy.

## 3. Erro de RLS (Row Level Security) Policies

**Sintomas:**
*   `Permission denied for table "X"`.
*   Usuários veem apenas seus próprios dados, mas não os dados da clínica (se essa não for a intenção).
*   Usuários conseguem ver dados de outras clínicas (falha de segurança).
*   O "Health Check Panel" falha no teste de "Política de RLS (Leitura)".

**Possíveis Causas e Soluções:**

*   **RLS Não Habilitado:**
    *   **Verificação:** No Supabase, vá em **Authentication -> Policies**. Certifique-se de que RLS está habilitado para a tabela (`Enable RLS`).
    *   **Solução:** Habilite RLS para a tabela afetada.
*   **Política Incorreta/Faltante:**
    *   **Verificação:** Verifique o conteúdo do script `002_create_rls_policies.sql`. Cada tabela relevante deve ter uma política `FOR ALL` que utiliza `is_member_of_clinic(clinic_id)`.
    *   **Solução:** Recrie as políticas RLS usando o script `002_create_rls_policies.sql` ou ajuste-as manualmente.
*   **Função `is_member_of_clinic()` Ausente/Com Erro:**
    *   **Verificação:** No Supabase, vá em **Database -> Functions**. Certifique-se de que a função `public.is_member_of_clinic(p_clinic_id uuid)` existe e está correta.
    *   **Solução:** Recrie a função conforme o script de migração.
*   **`clinic_id` no `profiles` Incorreto:**
    *   **Verificação:** O RLS depende do `clinic_id` do usuário logado (armazenado em `public.profiles`).
    *   **Solução:** Verifique se o `clinic_id` do seu `profile` corresponde ao `clinic_id` da clínica que você está tentando acessar.

## 4. Realtime Não Funcionando (Mensagens/Conversas Não Atualizam)

**Sintomas:**
*   Novas mensagens ou conversas não aparecem na UI; é preciso recarregar a página.
*   O "Health Check Panel" falha no teste de "Assinatura Realtime".
*   Erros de WebSocket no console do navegador.

**Possíveis Causas e Soluções:**

*   **Realtime Não Habilitado para as Tabelas:**
    *   **Verificação:** No Supabase, vá em **Database -> Replication**. As tabelas `conversations` e `messages` (e quaisquer outras que você queira em tempo real) devem estar listadas e habilitadas para a Replicação.
    *   **Solução:** Habilite a replicação para essas tabelas.
*   **Problemas de WebSocket:**
    *   **Verificação:** No console do navegador, vá para a aba `Network` e filtre por `WS` (WebSocket). Procure por conexões `wss://...supabase.co/realtime/v1/`. Erros de conexão ou status "closed" indicam um problema.
    *   **Solução:** Verifique firewalls ou proxies. Certifique-se de que `VITE_SUPABASE_URL` está correto, pois o Realtime usa a mesma URL base.
*   **Filtro de Canal Incorreto no Frontend:**
    *   **Verificação:** Nos hooks `useConversations.js` e `useMessages.js`, verifique se o filtro `filter: \`clinic_id=eq.${profile.clinic_id}\`` ou `filter: \`conversation_id=eq.${conversationId}\`` está sendo aplicado corretamente na assinatura do canal.
    *   **Solução:** Ajuste os filtros para corresponder aos dados esperados.
*   **`supabase.removeChannel()` Precoce:**
    *   **Verificação:** Garanta que a função de limpeza do `useEffect` esteja sendo executada apenas quando o componente (ou o hook) é realmente desmontado, e não em cada re-renderização desnecessária.

## 5. Mensagens/Conversas Não Aparecendo

**Sintomas:**
*   A lista de conversas está vazia ou não mostra as conversas esperadas.
*   O `ChatWindow` não exibe o histórico de mensagens.

**Possíveis Causas e Soluções:**

*   **RLS Impedindo Leitura:** (Ver seção 3 sobre RLS). O usuário autenticado pode não ter permissão para ler as conversas/mensagens devido a políticas de RLS.
*   **`fetchConversations`/`fetchMessages` Retornando Vazio/Erro:**
    *   **Verificação:** Adicione `console.log` dentro de `fetchConversations` e `fetchMessages` em `lib/messaging.js` para ver os dados/erros retornados diretamente do Supabase.
    *   **Solução:** Verifique as queries. Se a query estiver usando `!inner` (JOIN interno) e não houver dados correspondentes na tabela relacionada, a linha inteira não será retornada.
*   **Dados Inexistentes no Banco de Dados:**
    *   **Verificação:** Use o SQL Editor para verificar se as tabelas `conversations` e `messages` contêm os dados esperados para a `clinic_id` e `conversation_id` em questão.
    *   **Solução:** Insira dados de teste usando `TESTING_QUERIES.md`.
*   **Filtros Incorretos na UI:**
    *   **Verificação:** Na `ConversationList`, verifique se os filtros de canal e status estão configurados para "all" ou para os valores corretos.
    *   **Solução:** Ajuste os filtros na UI.

## 6. Dados do Contato Não Aparecendo no `ContactPanel`

**Sintomas:** O `ContactPanel` está vazio ou exibe "Nenhum contato selecionado" mesmo com uma conversa ativa.

**Possíveis Causas e Soluções:**

*   **`selectedConversation.contact_id` é `null`/`undefined`:**
    *   **Verificação:** Certifique-se de que a `conversation` selecionada possui um `contact_id` válido.
    *   **Solução:** Verifique como a conversa é selecionada e se o objeto `conversation` contém o `contact_id`.
*   **RLS Impedindo Leitura:** (Ver seção 3 sobre RLS).
*   **`fetchContactDetails` Retornando Vazio/Erro:**
    *   **Verificação:** Adicione `console.log` em `fetchContactDetails` em `lib/messaging.js`.
    *   **Solução:** Verifique a query para a tabela `contacts`. Garanta que há um `contact` com o `contact_id` fornecido e que a `clinic_id` corresponde.

## 7. Performance Lenta (UI Lenta, Carregamentos Demorados)

**Sintomas:** A aplicação demora para carregar listas, o chat trava com muitas mensagens, ou a UI responde lentamente.

**Possíveis Causas e Soluções:**

*   **Falta de Paginação:**
    *   **Verificação:** Se as listas `conversations` ou `messages` possuem centenas/milhares de itens e são carregadas de uma vez, isso é um gargalo.
    *   **Solução:** **PRIORIDADE:** Implementar paginação ou "infinite scroll" nos hooks `useConversations` e `useMessages`.
*   **Queries Ineficientes:**
    *   **Verificação:** Monitore os logs de banco de dados do Supabase. Use `EXPLAIN ANALYZE` no SQL Editor para suas queries mais complexas.
    *   **Solução:** Otimize as queries. Certifique-se de que há índices nas colunas usadas em `WHERE` e `JOIN` (Ver `003_create_indexes.sql`). Considere criar `views` ou funções RPC para pré-computar dados complexos.
*   **Re-renderizações Excessivas:**
    *   **Verificação:** Use o Profiler do React DevTools para identificar componentes que estão re-renderizando com frequência desnecessária.
    *   **Solução:** Utilize `React.memo` para componentes puros, `useCallback` e `useMemo` para memoizar funções e valores passados como `props`.

## 8. Erro de Autenticação

**Sintomas:** Usuários não conseguem fazer login/registrar, ou perdem a sessão inesperadamente.

**Possíveis Causas e Soluções:**

*   **`handle_new_user()` Trigger Incorreto/Ausente:**
    *   **Verificação:** Este trigger é crucial para criar um `profile` para novos usuários. No Supabase, vá em **Database -> Triggers**.
    *   **Solução:** Recrie o trigger `handle_new_user` se ele estiver faltando ou com erros.
*   **Problemas com `SupabaseAuthContext`:**
    *   **Verificação:** Adicione `console.log` no `useAuth` e `SupabaseAuthContext.jsx` para verificar o estado da sessão (`session`, `user`, `profile`).
    *   **Solução:** Verifique se o `AuthProvider` está envolvendo `App.jsx` corretamente.

## 9. Erro de CORS (Cross-Origin Resource Sharing)

**Sintomas:** Requisições para Edge Functions (ou outras APIs) falham com erros de CORS no console do navegador.

**Possíveis Causas e Soluções:**

*   **Edge Function não retorna `corsHeaders`:**
    *   **Verificação:** Para cada Edge Function que recebe requisições de um domínio diferente, ela DEVE incluir `import { corsHeaders } from "./cors.ts";` e aplicar esses headers na resposta (`...corsHeaders, 'Content-Type': 'application/json'`).
    *   **Solução:** Adicione os `corsHeaders` às suas Edge Functions.
*   **Domínio da Aplicação Não Permitido:**
    *   **Verificação:** Se você estiver usando um backend externo (não Supabase Edge Functions), verifique a configuração de CORS desse backend.
    *   **Solução:** Adicione o domínio do seu frontend à lista de domínios permitidos no seu backend.

## 10. Migrações SQL Falhando

**Sintomas:** Ao executar scripts SQL no Supabase, um erro é exibido.

**Possíveis Causas e Soluções:**

*   **Ordem Incorreta:**
    *   **Verificação:** As migrações devem ser executadas na ordem numérica (001, 002, 003, 004).
    *   **Solução:** Verifique e siga a ordem correta (`MIGRATION_INSTRUCTIONS.md`).
*   **Erro de Sintaxe SQL:**
    *   **Verificação:** O erro geralmente aponta para a linha e coluna exatas do problema.
    *   **Solução:** Revise o SQL cuidadosamente.
*   **Dependência Ausente:**
    *   **Verificação:** Um script pode tentar referenciar uma tabela ou função que ainda não existe porque o script anterior não foi executado ou falhou.
    *   **Solução:** Assegure-se de que o script anterior foi bem-sucedido. Use `DROP TABLE IF EXISTS` e `DROP TYPE IF EXISTS` nos scripts para garantir idempotência durante o desenvolvimento.

## 11. Dados Duplicados

**Sintomas:** Ao inserir dados, você percebe que registros idênticos estão sendo criados, ou há erros de `UNIQUE constraint violation`.

**Possíveis Causas e Soluções:**

*   **Falta de `UNIQUE` Constraints:**
    *   **Verificação:** Revise o schema do banco de dados (`001_create_multichannel_tables.sql`). Campos que devem ser únicos (ex: `clinic_id`, `channel_id`, `external_id` na tabela `contacts`) devem ter uma `UNIQUE` constraint.
    *   **Solução:** Adicione `UNIQUE(...)` às colunas apropriadas.
*   **`UPSERT` Lógica Incorreta:**
    *   **Verificação:** Se você está usando `UPSERT` em vez de `INSERT`, verifique a condição `ON CONFLICT (...) DO UPDATE SET ...` para garantir que ela identifica corretamente registros existentes.
    *   **Solução:** Ajuste a lógica de `UPSERT`.

## 12. Timestamps Incorretos (`created_at`, `updated_at`)

**Sintomas:** Os campos `created_at` ou `updated_at` não são preenchidos, são nulos, ou não são atualizados automaticamente.

**Possíveis Causas e Soluções:**

*   **`004_create_triggers.sql` Não Executado:**
    *   **Verificação:** A atualização automática de `updated_at` depende do trigger `on_X_update` e da função `handle_updated_at()`.
    *   **Solução:** Garanta que o script `004_create_triggers.sql` foi executado com sucesso.
*   **Colunas com `DEFAULT NOW()`:**
    *   **Verificação:** `created_at` deve ter `DEFAULT NOW()` na definição da tabela.
    *   **Solução:** Verifique o script `001_create_multichannel_tables.sql`.

## 13. Avatares/Imagens Não Carregando

**Sintomas:** Imagens de perfil ou anexos de mídia não aparecem na UI.

**Possíveis Causas e Soluções:**

*   **URL Incorreta/Quebrada:**
    *   **Verificação:** Inspecione o elemento `<img>` no navegador (Ferramentas do Desenvolvedor) e tente abrir a `src` da imagem em uma nova aba.
    *   **Solução:** Verifique a URL no banco de dados. Certifique-se de que a imagem foi carregada corretamente para o Supabase Storage ou serviço de CDN.
*   **RLS/Permissão no Supabase Storage:**
    *   **Verificação:** No Supabase, vá em **Storage -> Policies**. Buckets e objetos podem ter RLS que impede o acesso público.
    *   **Solução:** Ajuste as políticas de RLS do seu bucket de Storage para permitir leitura pública ou para usuários autenticados.

## 14. Debugging com o Painel de Health Check

*   **Acesse a Rota `/health-check`:** Esta página executa uma série de verificações automáticas na sua integração com o Supabase.
*   **Interprete os Resultados:**
    *   `Conexão com Supabase`: Verifica as variáveis de ambiente e a conectividade básica.
    *   `Política de RLS (Leitura)`: Garante que você pode ler dados protegidos por RLS para a sua clínica.
    *   `Assinatura Realtime`: Testa a conexão WebSocket e a capacidade de assinar um canal.
*   **Use como Ponto de Partida:** Se qualquer um desses testes falhar, ele apontará a direção geral do problema. Combine com a seção relevante deste guia para uma depuração mais aprofundada.