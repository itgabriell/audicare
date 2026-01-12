# Guia de Solução de Problemas (Troubleshooting) - Atualizado

Este guia aborda problemas comuns que podem ocorrer na aplicação AudiCare, com foco no módulo de Atendimento Multicanal e erros de inicialização.

### 1. Erro `column "..." does not exist` (Código 42703)

**Sintomas:**
*   A Caixa de Entrada exibe um erro "Falha ao carregar as conversas".
*   O console do navegador mostra um erro com a mensagem `Error: Erro de Schema: A coluna referenciada na query não existe. (Code: 42703)`.
*   O log `[messaging.js] FATAL: A coluna não existe...` aparece no console.

**Causa Raiz:**
*   Existe uma incompatibilidade entre o código da aplicação (especificamente a query em `lib/messaging.js`) e a estrutura real da tabela no banco de dados Supabase. Por exemplo, o código pode tentar selecionar uma coluna `channel` quando o nome real da coluna é `channel_type`.

**Soluções:**
1.  **Identifique a Coluna Faltante:** O log de erro no console geralmente informa qual coluna está causando o problema.
2.  **Verifique a Estrutura Real:** Vá para o **SQL Editor** no painel do Supabase e execute a query para inspecionar a tabela problemática. Exemplo para a tabela `contacts`:

### 2. Erro `TypeError: m is not a function` na tela de login

**Sintomas:**
*   Ao tentar fazer login, nada acontece na interface, mas o console do navegador exibe um erro como `Uncaught (in promise) TypeError: m is not a function`.
*   A variável `m` pode ter outro nome (ex: `a`, `t`) dependendo da minificação do código, mas o erro sempre indicará que "algo não é uma função".
*   O erro ocorre em um arquivo de bundle como `LoginPage-e2cc53c5.js`.

**Causa Raiz:**
*   Este erro ocorre quando o código tenta invocar uma função que, no momento da chamada, é `undefined`. No contexto da `LoginPage`, a causa mais comum é que a função `signIn` não está sendo corretamente fornecida pelo `SupabaseAuthContext`. O componente `LoginPage` tenta chamar `signIn`, mas como ela não foi exportada pelo provedor de autenticação, o `useAuth()` hook retorna `undefined` para essa propriedade.

**Soluções:**
1.  **Diagnosticar no `LoginPage.jsx`**:
    *   Abra o arquivo `src/pages/LoginPage.jsx`.
    *   Dentro da função `handleSubmit`, adicione um `console.log` para verificar a existência da função `signIn` antes de chamá-la:

### 3. Erro `22P02: invalid input syntax for type enum`

**Sintomas:**
*   A Caixa de Entrada não carrega conversas e exibe uma mensagem de erro.
*   O console do navegador mostra um erro com o código `22P02` e a mensagem "invalid input syntax for type enum".
*   O log no console pode indicar: `Erro de Enum: O valor de status '...' é inválido.`

**Causa Raiz:**
*   Este erro ocorre quando a aplicação tenta filtrar ou inserir um valor de status (ex: `active`) que não existe no tipo `enum` correspondente no banco de dados (ex: `conversation_status`). Os valores de `enum` são estritamente definidos no banco de dados, e qualquer valor que não corresponda exatamente a um dos valores válidos será rejeitado.

**Soluções:**
1.  **Verificar os Valores Válidos do Enum:**
    *   Vá para o **SQL Editor** no painel do Supabase.
    *   Execute a seguinte query para obter a lista de todos os valores permitidos para o enum `conversation_status`:

### 4. Erro `401/403 session_not_found` no Logout - Comportamento Esperado

**Sintomas:**
*   Ao fazer logout, o console do navegador exibe um aviso ou erro com status `401` (Unauthorized) ou `403` (Forbidden), e a mensagem pode conter `session not found` ou `invalid JWT`.
*   Apesar do erro no console, o usuário é deslogado corretamente e redirecionado para a página de login.

**Causa Raiz:**
*   Este não é um erro crítico, mas sim um comportamento esperado. Ele ocorre quando a sessão do usuário no servidor Supabase já expirou (por exemplo, após um longo período de inatividade), mas o navegador ainda possui um token de sessão inválido/expirado no `localStorage`.
*   Quando o usuário clica em "Sair", a aplicação tenta invalidar o token no servidor, mas o servidor rejeita a requisição porque o token já é inválido.

**Solução (Implementada):**
*   A função `signOut` no `SupabaseAuthContext` foi projetada para lidar com este cenário de forma resiliente.
    1.  A chamada `supabase.auth.signOut()` é envolvida em um bloco `try...catch`.
    2.  Se um erro `401` ou `session not found` é capturado, ele é tratado como um "sucesso" de logout, pois o objetivo (não ter uma sessão ativa) já foi alcançado. Um aviso é logado no console em vez de um erro ser exibido para o usuário.
    3.  Um bloco `finally` garante que, **independentemente do resultado da chamada à API**, o estado local da aplicação (usuário e sessão) e os tokens de autenticação no `localStorage` sejam limpos.
*   Isso garante uma experiência de logout suave para o usuário, mesmo que sua sessão já tenha expirado no backend.

### 5. Erro `PGRST200` ao Carregar Mensagens: `Could not find relationship`

**Sintomas:**
*   A janela de chat não carrega as mensagens e exibe um erro.
*   O console do navegador mostra um erro com código `PGRST200` e a mensagem `Could not find a relationship between 'messages' and 'profiles' in the schema cache`.

**Causa Raiz:**
*   Este erro ocorria porque a query para buscar mensagens (`fetchMessages`) tentava fazer um `join` com a tabela `profiles` para obter o nome do remetente. No entanto, a relação de chave estrangeira (`sender_id` na tabela `messages` referenciando `id` na tabela `profiles`) não estava corretamente configurada ou era nula para algumas mensagens, fazendo com que o Supabase não conseguisse resolver a relação.

**Solução (Implementada):**
*   A dependência do `join` com a tabela `profiles` foi removida da função `fetchMessages` em `src/lib/messaging.js`.
    1.  A query agora busca apenas os dados da própria tabela `messages` (`select('*')`), que já contém a informação `sender_type`.
    2.  O componente da interface (`ChatMessage.jsx`) foi atualizado para determinar se a mensagem é do usuário ou do contato com base no campo `sender_type` ('user' ou 'contact').
    3.  Isso simplifica a busca de dados, aumenta a resiliência (não quebra se o `sender_id` for nulo) e resolve o erro `PGRST200`. A interface continua funcionando como esperado, exibindo as mensagens nos lados corretos da conversa.

### 6. Erro `23505: duplicate key value violates unique constraint` na criação de contatos

**Sintomas:**
*   Ao receber uma nova mensagem de um contato existente, a aplicação pode falhar.
*   Ao tentar criar um "lead" ou contato que já existe, um erro é retornado pela API.
*   O console do navegador ou o log do servidor exibe um erro com o código `23505` e uma mensagem como `duplicate key value violates unique constraint "contacts_clinic_id_phone_key"`.

**Causa Raiz:**
*   Este erro ocorre porque o código estava usando `supabase.from('contacts').insert()` para criar novos contatos. A tabela `contacts` possui uma restrição de unicidade (`unique constraint`) na combinação das colunas `clinic_id` e `phone`, o que impede a existência de dois contatos com o mesmo número de telefone na mesma clínica. A tentativa de inserir um registro que viola essa restrição resulta no erro `23505`.

**Solução (Implementada):**
*   Todas as chamadas `insert()` para a tabela `contacts` foram substituídas por `upsert()`.
*   A operação de `upsert` foi configurada com a opção `onConflict: 'clinic_id,phone'`. Isso instrui o Supabase a, em caso de conflito (quando um contato com o mesmo `clinic_id` e `phone` já existe), não gerar um erro, mas sim tratar a situação.
*   A opção `ignoreDuplicates: true` (ou `false` se precisarmos dos dados de volta) garante que a operação seja concluída sem falhas. Se `false`, ele atualiza o registro existente; se `true`, ele simplesmente ignora a inserção.
*   **Onde foi aplicado?** A correção foi implementada em todos os locais relevantes, incluindo:
    *   `src/lib/messaging.js` (na função `handleIncomingMessage`, que processa webhooks).
    *   `src/database.js` (na função `addLead`).
    *   `src/lib/seedData.js` (para tornar o script de seed resiliente).
    *   Edge Functions (`n8n-webhook`) que lidam com a criação de contatos.
*   Essa abordagem "Find or Create" (Encontre ou Crie) garante que a lógica de criação de contatos seja idempotente e não quebre a aplicação se um contato já existir no banco de dados.