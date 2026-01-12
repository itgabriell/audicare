# Guia de Validação de Integração do WhatsApp

Este documento fornece um roteiro detalhado para validar a integração do WhatsApp no sistema AudiCare, garantindo que todos os componentes (frontend, backend, APIs e serviços de terceiros) estejam se comunicando corretamente e de forma segura.

---

## Visão Geral do Processo de Validação

O processo de validação cobre todo o ciclo de vida da mensagem, desde a configuração inicial até a entrega e recebimento em tempo real. Ele utiliza ferramentas de diagnóstico integradas (`WhatsApp Integration Validator`, `API Debug Panel`) para executar testes automatizados e manuais.

**Objetivos:**
*   Confirmar a conectividade com o Backend e a API do WhatsApp (UAZAPI).
*   Validar a segurança (JWT, exposição de segredos).
*   Garantir a funcionalidade de envio e recebimento de mensagens.
*   Verificar a sincronização em tempo real e resiliência (offline).

---

## Passo a Passo da Validação

### Passo 1: Acessar Ferramentas de Validação

1.  Navegue para a página **Inbox** (`/inbox`).
2.  No cabeçalho (ou na barra lateral em mobile), localize o botão **Ferramentas de Diagnóstico** (ícone de Atividade/Monitor 📈 ou 🐞).
3.  Clique para abrir o painel lateral.
4.  Selecione a aba **Validação** para acessar o `WhatsApp Integration Validator`.

### Passo 2: Verificar Configuração do Backend URL

1.  No painel de validação, inicie os testes ou verifique a seção **Configuração**.
2.  **Validação:** Confirme se a URL do backend está apontando para produção:
    *   **Esperado:** `https://api.audicarefono.com.br`
    *   **Status:** Deve mostrar um ícone verde (PASS).
3.  **Troubleshooting:** Se mostrar `localhost` ou outra URL em produção, verifique as variáveis de ambiente `VITE_API_BASE_URL` no arquivo `.env`.

### Passo 3: Teste de Health-Check

1.  Execute o teste "Health Check Endpoint".
2.  O sistema fará uma requisição `GET /api/wa/health-check`.
3.  **Resultado Esperado:**
    *   Status HTTP: `200 OK`.
    *   Resposta JSON: `{ "status": "connected", "message": "Service is healthy" }` (ou similar).
    *   Indicador visual: Verde.
4.  **Troubleshooting:** Se falhar (Vermelho/500), o serviço de backend pode estar fora do ar ou a instância do WhatsApp desconectada. Verifique os logs do servidor.

### Passo 4: Validação de Token JWT

1.  Verifique a seção **Segurança** no validador.
2.  **Validação:** O sistema verifica se existe uma sessão Supabase ativa e se o token não expirou.
3.  **Resultado Esperado:**
    *   Status: `Valid`.
    *   Expiração: Data futura.
4.  **Troubleshooting:** Se inválido, faça logout e login novamente. Se persistir, verifique as configurações de `SUPABASE_URL` e `ANON_KEY`.

### Passo 5: Teste de Envio de Texto (Endpoint Send-Text)

1.  Vá para a aba **Testes Manuais** ou use o teste automatizado de envio.
2.  Insira um número de telefone de teste (ex: seu próprio celular).
3.  Clique em "Enviar Teste".
4.  **Validação:** O sistema envia um POST para `/api/wa/send-text`.
5.  **Resultado Esperado:**
    *   Status HTTP: `200 OK`.
    *   Resposta: `{ "messageId": "...", "status": "queued/sent" }`.
6.  **Troubleshooting:** Erro 401 indica falha de auth. Erro 400/422 indica payload inválido. Erro 500 indica falha na UAZAPI.

### Passo 6: Verificação de Entrega (WhatsApp Real)

1.  Verifique o celular do número de teste usado no Passo 5.
2.  **Validação:** A mensagem de teste deve aparecer no aplicativo WhatsApp real.
3.  **Resultado Esperado:** Mensagem recebida com o texto enviado.
4.  **Troubleshooting:** Se a API retornou sucesso mas a mensagem não chegou, verifique se o número está correto e se a instância do WhatsApp no servidor está escaneada e online.

### Passo 7: Verificar Webhook Receiver

1.  Abra o **API Debug Panel** (botão flutuante no canto inferior direito).
2.  Vá para a aba **Status & Webhooks**.
3.  **Validação:** Verifique o indicador "Conexão Realtime".
4.  **Resultado Esperado:**
    *   Status: **Conectado** (Verde).
    *   Canal: Escutando `messages` e `contacts`.
5.  **Troubleshooting:** Se estiver vermelho, verifique a conexão de internet e se o serviço Supabase Realtime está ativo.

### Passo 8: Teste de Recebimento (Inbox)

1.  Do seu celular de teste, envie uma mensagem para o número conectado ao sistema.
2.  Observe a **Inbox** do AudiCare.
3.  **Resultado Esperado:**
    *   A mensagem deve aparecer na lista de conversas quase instantaneamente.
    *   O contador de mensagens não lidas deve incrementar.
    *   O **API Debug Panel** deve registrar um novo evento `INSERT` na tabela `messages`.
4.  **Troubleshooting:** Se não aparecer, o Webhook da UAZAPI pode não estar configurado para apontar para o endpoint do Supabase/Backend, ou a Edge Function `zapi-webhook` está falhando.

### Passo 9: Verificar Endpoint de Contatos

1.  Execute o teste "Contacts Endpoint".
2.  O sistema faz um `GET /api/wa/contacts`.
3.  **Resultado Esperado:** Retorna uma lista (array) de objetos de contato. Status 200.
4.  **Troubleshooting:** Se vazio ou erro, verifique se a sincronização de contatos foi executada no backend.

### Passo 10: Verificar Endpoint de Histórico de Chat

1.  Selecione uma conversa na Inbox.
2.  O sistema carrega o histórico via `GET /api/wa/chat-history/:phone`.
3.  **Resultado Esperado:** As mensagens anteriores carregam na janela de chat.
4.  **Troubleshooting:** Se falhar, verifique se o formato do telefone na URL está correto (apenas números).

### Passo 11: Sincronização em Tempo Real (UI)

1.  Com a Inbox aberta em duas abas (ou navegadores diferentes), envie uma mensagem de uma delas.
2.  **Resultado Esperado:** A outra aba deve atualizar instantaneamente mostrando a nova mensagem enviada, sem precisar de refresh (F5).
3.  **Troubleshooting:** Falha indica problema no Supabase Realtime ou nos `useEffect` de subscrição no frontend.

### Passo 12: Validação de Fila Offline

1.  Use a ferramenta de simulação de rede do navegador para ficar "Offline".
2.  Tente enviar uma mensagem na Inbox.
3.  **Resultado Esperado:**
    *   A mensagem aparece na UI como "Pendente" ou "Enviando...".
    *   Não ocorre erro de crash.
    *   Ao voltar "Online", a mensagem é enviada automaticamente.
4.  **Troubleshooting:** Se a mensagem se perder, a lógica de `offlineQueue` no `HealthCheckService` ou `useMessages` precisa de revisão.

### Passo 13: Auditoria de Segurança (Token UAZAPI)

1.  Abra o **Console do Desenvolvedor** (F12) -> aba **Network**.
2.  Filtre por requisições XHR/Fetch.
3.  Inspecione os headers das requisições para a API.
4.  **Validação:** Verifique se o token da UAZAPI (`Z-API-TOKEN` ou similar) **NÃO** está visível nos headers da requisição feita pelo frontend. O frontend deve usar apenas o JWT do Supabase.
5.  **Resultado Esperado:** O token da API externa é injetado apenas pelo Backend/Edge Function, nunca pelo cliente.

### Passo 14: Performance (Tempos de Resposta)

1.  No **WhatsApp Integration Validator**, verifique a coluna de latência dos testes.
2.  **Resultado Esperado:**
    *   Health Check: < 500ms.
    *   Listagem de Contatos: < 1500ms (depende do volume).
    *   Envio de Mensagem: < 1000ms.
3.  **Troubleshooting:** Latências altas indicam gargalo na Edge Function ou na API de terceiros.

---

## Critérios de Sucesso para Go-Live

Para considerar a integração validada e pronta para produção, os seguintes critérios devem ser atendidos:

*   [ ] **Score de Validação:** > 90% no painel `Integration Audit`.
*   [ ] **Health Check:** 100% Sucesso em 5 tentativas consecutivas.
*   [ ] **End-to-End:** Mensagem enviada e recebida com sucesso em < 5 segundos.
*   [ ] **Segurança:** Nenhum segredo de API exposto no cliente.
*   [ ] **Resiliência:** Sistema recupera conexão Realtime automaticamente após interrupção de rede.

---

## Checklist Final de Sign-Off

| Item | Responsável | Status | Data |
| :--- | :--- | :--- | :--- |
| Backend URL Configurada (Prod) | DevOps | ⬜ | |
| Webhooks Configurados na UAZAPI | Dev Backend | ⬜ | |
| Teste de Envio (Texto/Mídia) | QA | ⬜ | |
| Teste de Recebimento (Realtime) | QA | ⬜ | |
| Validação de Segurança (Audit) | SecOps | ⬜ | |
| Teste de Carga (Simples) | Dev | ⬜ | |

---

**Nota:** Qualquer falha nos passos críticos (3, 4, 5, 8) é bloqueante para o lançamento (Go-Live blocker).