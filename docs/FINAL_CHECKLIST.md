# Checklist Final de Validação (Pré-Deploy)

Este checklist deve ser completado antes de considerar o deploy do módulo de Atendimento Multicanal para um ambiente de produção ou homologação.

## 1. Configuração do Ambiente

- [ ] Todas as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) estão configuradas corretamente no ambiente de deploy.
- [ ] O projeto Supabase de destino (Produção/Homologação) está criado e acessível.
- [ ] As credenciais de serviços externos (n8n, APIs de canais) estão armazenadas de forma segura (ex: Supabase Secrets).

## 2. Banco de Dados

- [ ] Todas as migrações (`001` a `004`) foram executadas com sucesso e na ordem correta no banco de dados de destino.
- [ ] As políticas de Row-Level Security (RLS) estão ativas em todas as tabelas sensíveis.
- [ ] Os índices foram criados e verificados.
- [ ] Os gatilhos (`triggers`) para `updated_at` estão funcionando.
- [ ] A função `is_member_of_clinic` foi testada e garante o isolamento de dados.

## 3. Funcionalidade da Aplicação (Testes Manuais)

### 3.1. Caixa de Entrada
- [ ] A lista de conversas carrega corretamente ao abrir a página.
- [ ] Clicar em uma conversa abre a janela de chat e o painel de contato correspondente.
- [ ] O envio de uma mensagem pelo `ChatInput` funciona, e a mensagem aparece no chat (teste de atualização otimista).
- [ ] O scroll automático para a última mensagem funciona.
- [ ] Os filtros de conversa (por canal e status) funcionam conforme o esperado.
- [ ] A busca por nome ou telefone na lista de conversas funciona.

### 3.2. Realtime
- [ ] **Receber Mensagem:** Ao inserir uma nova mensagem no banco de dados manualmente (via SQL Editor), a mensagem aparece no `ChatWindow` em tempo real, sem recarregar a página.
- [ ] **Atualizar Conversa:** Ao receber uma nova mensagem, a conversa correspondente sobe para o topo da `ConversationList`.
- [ ] **Nova Conversa:** Ao criar uma nova conversa no banco, ela aparece na `ConversationList`.

### 3.3. Painel de Contato
- [ ] Os detalhes do contato (nome, telefone, etc.) são exibidos corretamente.
- [ ] As informações do paciente associado e seus agendamentos são carregados e exibidos.

### 3.4. Configurações de Canal
- [ ] O painel de configuração de canais carrega os canais existentes.
- [ ] É possível abrir o modal para editar/adicionar credenciais.
- [ ] O salvamento e o teste de conexão funcionam (mesmo que simulados).

### 3.5. Autenticação e Autorização
- [ ] Um usuário de uma clínica **NÃO** consegue ver os dados (conversas, contatos) de outra clínica.
- [ ] Um usuário não autenticado é redirecionado para a página de login.

## 4. Diagnóstico e Performance

- [ ] A página `/health-check` foi acessada e todos os testes passaram com sucesso (Conexão, RLS, Realtime).
- [ ] Os tempos de carregamento iniciais da "Caixa de Entrada" são aceitáveis.
- [ ] Não há erros visíveis no console do navegador durante o uso normal da aplicação.
- [ ] Os estados de `loading` (skeletons) e `empty` são exibidos corretamente.

## 5. Build de Produção

- [ ] O comando `npm run build` (ou `yarn build`) é executado sem erros.
- [ ] A aplicação gerada no diretório `dist/` é servida corretamente em um ambiente de preview.