# Plano de Testes do Módulo de Atendimento Multicanal

Este documento descreve o plano de testes para garantir a qualidade e funcionalidade do módulo de Atendimento Multicanal.

## 1. Estratégia de Testes

*   **Testes Unitários:** Foco em funções e componentes isolados (a serem implementados com bibliotecas como Jest/React Testing Library).
*   **Testes de Integração:** Verificar a comunicação entre componentes, hooks e o backend (Supabase/Edge Functions).
*   **Testes de End-to-End (E2E):** Simular o fluxo completo do usuário, desde o recebimento de uma mensagem externa até a resposta do agente.
*   **Testes de Performance:** Avaliar a responsividade da UI e a latência das operações em tempo real.
*   **Testes de Segurança:** Validar as políticas de RLS e a proteção de dados.
*   **Testes de Usabilidade:** Garantir que a interface é intuitiva e fácil de usar.

## 2. Ambientes de Teste

*   **Desenvolvimento Local:** Para testes unitários e de integração iniciais.
*   **Ambiente de Staging/Homologação:** Um ambiente que replica a produção para testes E2E e de performance.
*   **Produção:** Monitoramento contínuo e testes de regressão após cada deploy.

## 3. Casos de Teste (Exemplos)

### 3.1. Testes de UI/UX (Manual)

*   **Layout Responsivo:**
    *   [ ] Verificar se o layout de 3 colunas se adapta corretamente em diferentes tamanhos de tela (desktop, tablet, mobile).
    *   [ ] Garantir que a navegação entre a lista de conversas e a janela de chat funciona no mobile.
*   **`ConversationList.jsx`:**
    *   [ ] Filtrar conversas por cada canal (WhatsApp, Instagram, Facebook).
    *   [ ] Filtrar conversas por status (Abertas, Fechadas, Pendentes).
    *   [ ] Realizar busca por nome e telefone do contato.
    *   [ ] Verificar estados de carregamento, vazio e erro.
    *   [ ] Clicar em uma conversa e verificar se ela é selecionada e o `ChatWindow` é atualizado.
*   **`ChatWindow.jsx`:**
    *   [ ] Enviar uma mensagem de texto e verificar se ela aparece no chat.
    *   [ ] Verificar se o scroll automático para a última mensagem funciona.
    *   [ ] Verificar a exibição de timestamps e avatares.
    *   [ ] Verificar estados de carregamento, vazio e erro.
*   **`ContactPanel.jsx`:**
    *   [ ] Verificar se os dados do contato são exibidos corretamente.
    *   [ ] Navegar entre as abas "Info", "Histórico" e "Agenda".
    *   [ ] Verificar a exibição dos canais conectados do contato.
*   **`ChannelSettings.jsx`:**
    *   [ ] Abrir e fechar o modal de configuração para cada canal.
    *   [ ] Inserir credenciais válidas e salvar.
    *   [ ] Inserir credenciais inválidas e verificar mensagens de erro.
    *   [ ] Clicar em "Testar Conexão" e verificar o feedback (sucesso/falha).
    *   [ ] Verificar se o `ChannelConnectionStatus` é atualizado após salvar/testar.

### 3.2. Testes de Integração (Manual/Automatizado)

*   **Fluxo de Mensagem (Recebimento):**
    *   [ ] Enviar uma mensagem de um canal externo (ex: WhatsApp) para o número configurado.
    *   [ ] Verificar se a mensagem aparece em tempo real na `ConversationList` e no `ChatWindow`.
    *   [ ] Verificar se o `unread_count` da conversa é incrementado.
    *   [ ] Verificar se o contato e a conversa são criados corretamente no banco de dados (se for a primeira interação).
*   **Fluxo de Mensagem (Envio):**
    *   [ ] Enviar uma mensagem do `ChatInput` para um contato.
    *   [ ] Verificar se a mensagem aparece otimisticamente na UI.
    *   [ ] Verificar se a mensagem é enviada com sucesso para o canal externo (via n8n/API).
    *   [ ] Verificar se o status da mensagem é atualizado no banco de dados (enviada, entregue, lida).
*   **Marcação como Lida:**
    *   [ ] Abrir uma conversa com mensagens não lidas.
    *   [ ] Verificar se o `unread_count` é zerado no banco de dados e na UI.
*   **Configuração de Canais:**
    *   [ ] Salvar credenciais válidas para um canal e verificar se são persistidas no banco de dados.
    *   [ ] Testar a conexão de um canal com credenciais válidas e inválidas.
    *   [ ] Verificar se as RLS policies impedem que uma clínica acesse as configurações de outra.

### 3.3. Testes de Performance

*   [ ] Carregar a `Inbox` com um grande número de conversas (ex: 100+).
*   [ ] Carregar um `ChatWindow` com um grande número de mensagens (ex: 500+).
*   [ ] Monitorar o uso de CPU/Memória do navegador e do backend (Supabase).
*   [ ] Avaliar a latência das atualizações em tempo real.

### 3.4. Testes de Segurança

*   [ ] Tentar acessar dados de outra clínica (RLS).
*   [ ] Tentar enviar mensagens como outro usuário.
*   [ ] Verificar a criptografia de credenciais sensíveis no banco de dados.

## 4. Ferramentas de Teste

*   **Manual:** Navegador, Postman/Insomnia, `curl`.
*   **Automatizado (Futuro):**
    *   **Unitários:** Jest, React Testing Library.
    *   **E2E:** Cypress, Playwright.
    *   **Performance:** k6, Artillery.

## 5. Critérios de Aceitação

*   Todas as funcionalidades descritas no `PROJECT_STATUS.md` e `INTEGRATION_ROADMAP.md` devem operar conforme o esperado.
*   A aplicação deve ser responsiva e utilizável em diferentes dispositivos.
*   Nenhum erro crítico deve ser encontrado.
*   As políticas de segurança devem ser rigorosamente aplicadas.
*   A performance deve ser aceitável para a carga esperada.