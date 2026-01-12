# Lista de Verificação de Validação Pré-Produção - Integração WhatsApp

Este documento detalha a lista de verificação abrangente para validar a integração do WhatsApp antes do lançamento em ambiente de produção. Ele garante que todos os aspectos, desde a configuração técnica até a experiência do usuário e a segurança, estejam prontos.

---

## Sumário Executivo

A integração do WhatsApp é um componente crítico do sistema AudiCare, permitindo a comunicação eficiente com os pacientes. Esta lista de verificação aborda as áreas essenciais para garantir um lançamento bem-sucedido e estável.

**Data de Elaboração:** 25 de Novembro de 2025

---

## Seções da Lista de Verificação:

1.  **Configuração do Backend**
2.  **Configuração da UAZAPI (ou Provedor WhatsApp)**
3.  **Autenticação e Autorização**
4.  **Funcionalidade dos Endpoints da API**
5.  **Fluxo de Mensagens (Entrada e Saída)**
6.  **Sincronização em Tempo Real**
7.  **Resiliência Offline**
8.  **Auditoria de Segurança**
9.  **Linha de Base de Performance**
10. **Tratamento de Erros**
11. **Monitoramento e Alertas**
12. **Documentação e Suporte**

---

### 1. Configuração do Backend

**Objetivo:** Garantir que todas as URLs e configurações de ambiente do backend estejam corretas e acessíveis.

| Item da Lista de Verificação                                | Descrição                                                                          | Resultado Esperado                                      | Critério Pass/Falha              | Procedimento de Resolução                                                                 | Procedimento de Escala                                                     |
| :---------------------------------------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------ | :------------------------------- | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **1.1. URL Base da API**                                    | Verifique se `API_BASE_URL` no frontend aponta para o ambiente de produção.        | `https://api.audicarefono.com.br`                        | **PASS:** URL correta e acessível | Atualizar `VITE_API_BASE_URL` no `.env` e reconstruir. | Notificar equipe de DevOps.                                                |
| **1.2. Acessibilidade do Backend**                          | O backend responde a uma requisição `HEAD` simples na URL base.                    | Status HTTP `200 OK` ou `30x` (redirecionamento válido) | **PASS:** Resposta HTTP válida   | Verificar status do servidor de backend e rede.                                           | Notificar equipe de DevOps/Infra.                                          |
| **1.3. Configuração UAZAPI Endpoints**                      | Todos os endpoints da `UAZAPI_ENDPOINTS` estão definidos e formatados corretamente. | Todos os valores são strings de URL válidas.            | **PASS:** Configuração completa  | Corrigir `apiConfig.js` e verificar `UAZAPI_ENDPOINTS` na documentação.                   | Notificar equipe de Desenvolvimento Frontend.                              |

---

### 2. Configuração da UAZAPI (ou Provedor WhatsApp)

**Objetivo:** Assegurar que a integração com o provedor de WhatsApp esteja funcional e segura.

| Item da Lista de Verificação                       | Descrição                                                          | Resultado Esperado                                                                  | Critério Pass/Falha        | Procedimento de Resolução                                                                 | Procedimento de Escala                                                 |
| :------------------------------------------------- | :----------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :------------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **2.1. Status da Instância do WhatsApp**           | A instância do WhatsApp no provedor (UAZAPI) está conectada e online. | Relatado como `online` ou `connected` no painel de admin do provedor.               | **PASS:** Instância Online | Renovar sessão QR Code, verificar credenciais no provedor.                                | Contatar suporte do provedor WhatsApp.                                 |
| **2.2. Webhooks Configurados**                     | Os webhooks de mensagens e status estão configurados corretamente. | Eventos (mensagens/status) chegam ao endpoint de webhook do nosso backend.          | **PASS:** Webhooks ativos  | Verificar URL do webhook e segredo no provedor e no Supabase Edge Function.               | Notificar equipe de Desenvolvimento Backend.                           |
| **2.3. Chaves de API no Backend**                  | As chaves/tokens da UAZAPI são armazenadas com segurança no backend. | As chaves estão em variáveis de ambiente ou Supabase Secrets (não hardcoded).       | **PASS:** Chaves seguras   | Mover chaves para segredos do ambiente ou Supabase Secrets.                               | Notificar equipe de Segurança/DevOps.                                  |

---

### 3. Autenticação e Autorização

**Objetivo:** Verificar se os usuários estão autenticados corretamente e se as permissões (RLS) estão funcionando.

| Item da Lista de Verificação                   | Descrição                                                          | Resultado Esperado                                                                  | Critério Pass/Falha                   | Procedimento de Resolução                                                                 | Procedimento de Escala                                                 |
| :--------------------------------------------- | :----------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :------------------------------------ | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **3.1. Validade do Token JWT**                 | O token JWT do usuário está presente e não expirado.               | `session.access_token` existe e `expires_at` é uma data futura.                     | **PASS:** Token ativo e válido        | Fazer logout e login novamente. Verificar `SUPABASE_KEY` e `URL`.                         | Notificar equipe de Desenvolvimento/Supabase.                          |
| **3.2. Acesso à Clínica do Usuário**           | Usuários só acessam dados (contatos, mensagens) da sua própria clínica. | Um usuário de uma clínica não consegue ver dados de outra clínica.                    | **PASS:** RLS funcionando             | Revisar políticas de RLS no Supabase (tabelas `messages`, `contacts`, `conversations`). | Notificar equipe de Segurança/Backend.                                 |
| **3.3. Papéis de Usuário (RLS)**               | Permissões de acordo com o papel do usuário (ex: admin, profissional). | Ações restritas (ex: excluir) são bloqueadas para usuários sem permissão.           | **PASS:** Papéis respeitados          | Verificar as políticas de RLS e o campo `role` na tabela `profiles`.                     | Notificar equipe de Segurança/Backend.                                 |

---

### 4. Funcionalidade dos Endpoints da API

**Objetivo:** Assegurar que os endpoints da API do WhatsApp estejam respondendo corretamente e retornando os dados esperados.

| Item da Lista de Verificação                      | Descrição                                                          | Resultado Esperado                                                    | Critério Pass/Falha            | Procedimento de Resolução                                                               | Procedimento de Escala                                                 |
| :------------------------------------------------ | :----------------------------------------------------------------- | :-------------------------------------------------------------------- | :----------------------------- | :-------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **4.1. Health Check Endpoint (`GET /wa/health-check`)** | Verifica a conectividade e o status da instância do WhatsApp.      | Resposta `200 OK` com `{ status: "connected" }`.                     | **PASS:** API Conectada        | Verificar logs da Edge Function `zapi-health-check` e status da instância.              | Notificar equipe de Desenvolvimento Backend/DevOps.                    |
| **4.2. Send Text Endpoint (`POST /wa/send-text`)** | Testa o envio de uma mensagem de texto (com payload de teste inválido). | Resposta `400 Bad Request` ou `422 Unprocessable Entity` (validação). | **PASS:** Endpoint responde    | Verificar logs da Edge Function `send-zapi-message`, payload e autenticação.            | Notificar equipe de Desenvolvimento Backend.                           |
| **4.3. Contacts Endpoint (`GET /wa/contacts`)**    | Busca uma lista de contatos do WhatsApp.                           | Resposta `200 OK` com array de objetos de contato.                    | **PASS:** Contatos listados    | Verificar `getContacts` no `whatsappService` e RLS na tabela `contacts`.                | Notificar equipe de Desenvolvimento Backend/DB.                        |
| **4.4. Chat History Endpoint (`GET /wa/chat-history/:phone`)** | Recupera o histórico de mensagens para um contato específico.      | Resposta `200 OK` com array de objetos de mensagem.                   | **PASS:** Histórico acessível  | Verificar `getMessages` no `whatsappService` e RLS na tabela `messages`.                | Notificar equipe de Desenvolvimento Backend/DB.                        |
| **4.5. Webhook Receiver**                         | O serviço de webhook no frontend está ouvindo eventos do Supabase Realtime. | O `WebhookReceiverService` no frontend relata `connected`.            | **PASS:** Listener ativo       | Verificar inicialização do `WebhookReceiverService` e status da conexão Realtime.         | Notificar equipe de Desenvolvimento Frontend/Backend (Realtime).       |

---

### 5. Fluxo de Mensagens (Entrada e Saída)

**Objetivo:** Validar o ciclo completo de envio e recebimento de mensagens.

| Item da Lista de Verificação                          | Descrição                                                              | Resultado Esperado                                                         | Critério Pass/Falha                  | Procedimento de Resolução                                                              | Procedimento de Escala                                                 |
| :---------------------------------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------- | :----------------------------------- | :------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **5.1. Envio de Mensagem (Outbound)**                 | Envie uma mensagem de texto do AudiCare para um contato real no WhatsApp. | Mensagem aparece no WhatsApp do destinatário. Status `sent`/`delivered` no AudiCare. | **PASS:** Mensagem enviada e recebida | Verificar logs do `send-text` no backend, tokens da UAZAPI.                              | Notificar equipe de Desenvolvimento Backend/UAZAPI.                    |
| **5.2. Recebimento de Mensagem (Inbound)**            | Envie uma mensagem de um contato real do WhatsApp para o AudiCare.       | Mensagem aparece no Inbox do AudiCare.                                    | **PASS:** Mensagem recebida no Inbox | Verificar configuração de webhook, Edge Function `zapi-webhook` e RLS.                 | Notificar equipe de Desenvolvimento Backend/Supabase.                  |
| **5.3. Envio de Mídia (Outbound)**                    | Envie uma imagem/áudio do AudiCare para um contato real.               | Mídia aparece no WhatsApp do destinatário.                                 | **PASS:** Mídia enviada            | Verificar `sendMedia` no `whatsappService`, permissões de arquivos na UAZAPI.            | Notificar equipe de Desenvolvimento Backend/UAZAPI.                    |
| **5.4. Exibição de Mídia Recebida (Inbound)**         | Receba uma imagem/áudio de um contato real no WhatsApp.                | Mídia aparece corretamente no ChatWindow do AudiCare.                      | **PASS:** Mídia exibida            | Verificar o `MediaViewer` e como o backend processa URLs de mídia de webhooks.           | Notificar equipe de Desenvolvimento Frontend/Backend.                  |
| **5.5. Marcação de Mensagens como Lidas**             | O AudiCare marca mensagens como lidas após abrir a conversa.             | `unread_count` para a conversa zera no backend e UI.                       | **PASS:** Marcação funcionando       | Verificar `markAsRead` no `whatsappService` e `update_conversation_on_new_message` trigger. | Notificar equipe de Desenvolvimento Backend/DB.                        |

---

### 6. Sincronização em Tempo Real

**Objetivo:** Garantir que as atualizações de mensagens e status ocorram em tempo real na interface do usuário.

| Item da Lista de Verificação                       | Descrição                                                              | Resultado Esperado                                                                | Critério Pass/Falha           | Procedimento de Resolução                                                            | Procedimento de Escala                                      |
| :------------------------------------------------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :---------------------------- | :----------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **6.1. Atualização Instantânea da UI**             | Nova mensagem chega do WhatsApp: aparece imediatamente na UI (sem refresh). | Mensagem aparece na UI em 1-3 segundos.                                          | **PASS:** UI atualizada rápido | Verificar conexão Realtime do Supabase, `webhookReceiverService` e `useMessages` hook. | Notificar equipe de Desenvolvimento Frontend/Backend (Realtime). |
| **6.2. Status de Conexão do WebSocket**            | O painel de debug (`APIDebugPanel`) mostra o status da conexão Realtime. | `WebhookReceiverService` mostra `Conectado` no `MonitoringDashboard`.             | **PASS:** Status visível      | Verificar inicialização do `WebhookReceiverService` e logs do console.               | Notificar equipe de Desenvolvimento Frontend.               |
| **6.3. Sincronização de Status de Mensagem**       | Status de envio (`sending`, `sent`, `delivered`, `read`) atualiza na UI. | O ícone de status da mensagem muda dinamicamente.                               | **PASS:** Status dinâmico     | Verificar `webhookReceiverService` para `message_update` events e o `ChatWindow`.    | Notificar equipe de Desenvolvimento Frontend/Backend.       |

---

### 7. Resiliência Offline

**Objetivo:** Assegurar que a aplicação lide com a perda de conexão de forma graciosa e que as mensagens sejam enfileiradas.

| Item da Lista de Verificação              | Descrição                                                               | Resultado Esperado                                                                  | Critério Pass/Falha        | Procedimento de Resolução                                                              | Procedimento de Escala                                       |
| :---------------------------------------- | :---------------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :------------------------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **7.1. Enfileiramento de Mensagens**      | Desconecte a internet (Chrome DevTools) e tente enviar uma mensagem.    | A mensagem é enfileirada (`status: queued`) e não há erro de crash.                 | **PASS:** Enfileiramento OK | Verificar `healthCheckService.addToQueue` e `whatsappService.sendText` error handling. | Notificar equipe de Desenvolvimento Frontend.                |
| **7.2. Processamento da Fila Offline**    | Reconecte a internet após enfileirar mensagens.                         | As mensagens enfileiradas são enviadas automaticamente.                             | **PASS:** Fila processada  | Verificar `healthCheckService.processOfflineQueue` e `useMessageCache` `processOfflineQueue`. | Notificar equipe de Desenvolvimento Frontend/Backend.                |
| **7.3. Notificação de Status Offline**    | A UI informa claramente o status offline ao usuário.                    | `SyncStatus` exibe `Offline` ou `Desconectado`.                                     | **PASS:** Notificação clara | Verificar `SyncStatus` e `healthCheckService.status` updates.                          | Notificar equipe de Desenvolvimento Frontend.                |

---

### 8. Auditoria de Segurança

**Objetivo:** Garantir que não haja exposição de informações sensíveis e que as políticas de segurança estejam ativas.

| Item da Lista de Verificação                 | Descrição                                                              | Resultado Esperado                                                                 | Critério Pass/Falha                 | Procedimento de Resolução                                                                    | Procedimento de Escala                                                 |
| :------------------------------------------- | :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :---------------------------------- | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **8.1. Sem Exposição de Tokens UAZAPI**      | O token da UAZAPI (ou provedor) NUNCA deve ser exposto no frontend.      | O `API Debug Panel` ou inspeção de rede não mostra o token em requisições do frontend. | **PASS:** Token oculto              | Verificar se o token é usado apenas em Edge Functions/Backend.                                 | **BLOQUEADOR DE PRODUÇÃO:** Notificar equipe de Segurança IMEDIATAMENTE. |
| **8.2. Políticas CORS**                      | Requisições de origens diferentes são tratadas corretamente.             | As requisições `fetch` para o backend não são bloqueadas por CORS.                 | **PASS:** CORS configurado          | Verificar configuração de CORS no backend/Edge Functions.                                      | Notificar equipe de DevOps/Backend.                                    |
| **8.3. JWT Transport Layer Security**        | O token JWT é transmitido apenas via HTTPS.                             | Todas as requisições de API usam `https`.                                          | **PASS:** HTTPS obrigatório         | Assegurar que `API_BASE_URL` e Supabase usem `https`.                                          | Notificar equipe de DevOps/Infra.                                      |
| **8.4. Validação de Payload (Injeção)**      | O backend valida os payloads para prevenir injeção de SQL/scripts.       | Requisições com payloads maliciosos são rejeitadas com erro `400/422`.             | **PASS:** Payload validado          | Implementar/melhorar validação de schema e sanitização no backend (Edge Functions).            | Notificar equipe de Desenvolvimento Backend/Segurança.                 |

---

### 9. Linha de Base de Performance

**Objetivo:** Medir e garantir que os tempos de resposta da API e a performance da UI estejam dentro dos limites aceitáveis.

| Item da Lista de Verificação                    | Descrição                                                                 | Resultado Esperado                                                                  | Critério Pass/Falha               | Procedimento de Resolução                                                              | Procedimento de Escala                                                 |
| :---------------------------------------------- | :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------- | :-------------------------------- | :------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **9.1. Tempo de Resposta (Health Check)**       | Latência da API do health-check.                                          | Média < 200ms.                                                                      | **PASS:** Latência baixa          | Otimizar Edge Function, verificar região do Supabase/UAZAPI.                             | Notificar equipe de DevOps/Backend.                                    |
| **9.2. Tempo de Resposta (Send Message)**       | Latência do envio de uma mensagem de texto.                               | Média < 500ms.                                                                      | **PASS:** Envio rápido            | Otimizar `send-zapi-message` Edge Function, verificar latência da UAZAPI.                | Notificar equipe de Desenvolvimento Backend/UAZAPI.                    |
| **9.3. Tempo de Resposta (Listar Contatos)**    | Latência para listar 50 contatos.                                         | Média < 1000ms.                                                                     | **PASS:** Listagem eficiente      | Otimizar query do Supabase, adicionar índices, otimizar `getContacts` no `whatsappService`. | Notificar equipe de Desenvolvimento Backend/DB.                        |
| **9.4. Tempo de Carregamento (Chat History)**   | Latência para carregar 50 mensagens em uma conversa.                      | Média < 1000ms.                                                                     | **PASS:** Histórico rápido        | Otimizar query do Supabase, adicionar índices, lazy loading de mensagens.                | Notificar equipe de Desenvolvimento Frontend/Backend.                  |
| **9.5. Performance da UI (Conversas)**          | Rolagem da lista de conversas e chat.                                     | Fluida, sem travamentos (FPS > 30).                                                 | **PASS:** UI fluida               | Otimizar renderização de componentes React, virtualização de listas.                     | Notificar equipe de Desenvolvimento Frontend.                          |

---

### 10. Tratamento de Erros

**Objetivo:** Validar que a aplicação lida com erros de forma graciosa, fornecendo feedback útil ao usuário.

| Item da Lista de Verificação          | Descrição                                                          | Resultado Esperado                                                                    | Critério Pass/Falha            | Procedimento de Resolução                                                               | Procedimento de Escala                                                 |
| :------------------------------------ | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------ | :----------------------------- | :-------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **10.1. Erros de Rede**               | Desconecte e reconecte a internet durante uso.                     | Notificações `toast` informam sobre a perda/restauração da conexão e erros de envio.  | **PASS:** Feedback claro       | Implementar mais `toast`s e `ErrorBoundary`s em pontos críticos.                        | Notificar equipe de Desenvolvimento Frontend.                          |
| **10.2. Erros de API (Backend)**      | Force um erro `500` no backend (`zapi-health-check` Edge Function). | `toast` com mensagem de erro amigável, não expõe detalhes internos do erro.           | **PASS:** Erro tratado         | Tratar erros no backend, retornando mensagens claras para o frontend.                     | Notificar equipe de Desenvolvimento Backend.                           |
| **10.3. Mensagens de Erro (UAZAPI)**  | Envie uma mensagem para um número inválido (pelo backend).         | `toast` informa "Número inválido" ou "Falha no envio".                               | **PASS:** Erro específico      | Mapear códigos de erro da UAZAPI para mensagens de erro amigáveis no backend.           | Notificar equipe de Desenvolvimento Backend/UAZAPI.                    |
| **10.4. Mecanismo de Retry**          | Mensagens que falham no envio têm um botão "Tentar Novamente".     | Clicar em "Tentar Novamente" re-envia a mensagem com sucesso (se o problema foi temporário). | **PASS:** Retry funcional      | Implementar lógica de retry para mensagens falhas no `ChatWindow`.                      | Notificar equipe de Desenvolvimento Frontend.                          |

---

### 11. Monitoramento e Alertas

**Objetivo:** Garantir que a aplicação e a infraestrutura estão sendo monitoradas e que alertas são gerados para problemas críticos.

| Item da Lista de Verificação                      | Descrição                                                              | Resultado Esperado                                                        | Critério Pass/Falha          | Procedimento de Resolução                                                              | Procedimento de Escala                                         |
| :------------------------------------------------ | :--------------------------------------------------------------------- | :------------------------------------------------------------------------ | :--------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **11.1. Logs de Integração**                      | Logs detalhados para todas as interações com a API externa e webhooks. | Logs claros no Supabase (Edge Functions) e `integration_logs` no DB.      | **PASS:** Logs completos     | Aprimorar logging em todas as Edge Functions e no `whatsappService`.                    | Notificar equipe de Desenvolvimento Backend/DevOps.            |
| **11.2. Métricas de Performance**                 | Métricas de latência e throughput coletadas (`MonitoringDashboard`).   | Gráficos no `MonitoringDashboard` mostram dados em tempo real.            | **PASS:** Métricas visíveis  | Configurar coleta de métricas em serviços e endpoints relevantes.                        | Notificar equipe de DevOps/Monitoramento.                      |
| **11.3. Alertas de Falha Crítica**                | Alertas são disparados para falhas de conexão da instância WhatsApp.     | Notificação via email/Slack/etc. para a equipe de plantão.                | **PASS:** Alertas funcionais | Configurar alertas baseados no status do `healthCheckService` ou logs do backend.         | **CRÍTICO:** Equipe de plantão.                                |
| **11.4. Auditoria de Segurança Contínua**         | Scanners de segurança rodando contra o ambiente de produção.             | Relatórios de vulnerabilidades são gerados e revisados periodicamente.    | **PASS:** Auditoria ativa    | Agendar scans regulares e seguir processo de remediação de vulnerabilidades.           | Notificar equipe de Segurança.                                 |

---

### 12. Documentação e Suporte

**Objetivo:** Fornecer recursos claros para suporte e desenvolvimento futuro.

| Item da Lista de Verificação                   | Descrição                                                          | Resultado Esperado                                                                  | Critério Pass/Falha                 | Procedimento de Resolução                                                               | Procedimento de Escala                                                 |
| :--------------------------------------------- | :----------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :---------------------------------- | :-------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **12.1. Documentação da API**                  | Documentação clara para os endpoints do WhatsApp no backend.       | API Blueprint/Swagger/OpenAPI para `https://api.audicarefono.com.br/api/wa`.        | **PASS:** Documentação atualizada   | Gerar documentação da API a partir do código ou criar manualmente.                      | Notificar equipe de Desenvolvimento Backend.                           |
| **12.2. Guias de Troubleshooting**             | `src/docs/WHATSAPP_INTEGRATION_VALIDATION.md` é atualizado.         | O documento reflete o estado atual da implementação e inclui soluções comuns.       | **PASS:** Guias atualizados         | Revisar e atualizar os guias de acordo com as últimas implementações e problemas.         | Notificar equipe de Desenvolvimento.                                   |
| **12.3. Plano de Resposta a Incidentes**       | Plano documentado para falhas da integração WhatsApp.              | Etapas claras para diagnóstico, resolução e comunicação em caso de falha.           | **PASS:** Plano existente           | Criar ou atualizar o plano de resposta a incidentes.                                    | Notificar equipe de Operações/DevOps.                                  |
| **12.4. Informações de Contato de Suporte**    | Informações de contato do provedor WhatsApp e equipes internas.    | Telefones/emails/links de suporte da UAZAPI e da equipe de plantão.                 | **PASS:** Contatos disponíveis      | Compilar e distribuir informações de contato de suporte.                                | Notificar equipe de Operações.                                         |

---

## Modelo de Assinatura (Go-Live Sign-Off)

**Projeto:** Integração WhatsApp AudiCare

**Versão da Aplicação:** `[Versão]`
**Data do Go-Live Proposto:** `[YYYY-MM-DD]`

Eu, os signatários abaixo, confirmo que revisei a Lista de Verificação de Validação Pré-Produção, e que todos os critérios marcados como "PASS" foram atendidos, ou que quaisquer itens de "WARNING" foram aceitos e documentados com planos de mitigação. A integração está pronta para ser lançada em ambiente de produção.

---

**Equipe de Desenvolvimento Frontend:**

*   **Nome:** `[Nome do Desenvolvedor]`
*   **Assinatura:** _________________________
*   **Data:** `[YYYY-MM-DD]`

---

**Equipe de Desenvolvimento Backend:**

*   **Nome:** `[Nome do Desenvolvedor]`
*   **Assinatura:** _________________________
*   **Data:** `[YYYY-MM-DD]`

---

**Equipe de DevOps/Infraestrutura:**

*   **Nome:** `[Nome do DevOps]`
*   **Assinatura:** _________________________
*   **Data:** `[YYYY-MM-DD]`

---

**Equipe de Qualidade (QA):**

*   **Nome:** `[Nome do QA]`
*   **Assinatura:** _________________________
*   **Data:** `[YYYY-MM-DD]`

---

**Gerência de Produto:**

*   **Nome:** `[Nome do Gerente de Produto]`
*   **Assinatura:** _________________________
*   **Data:** `[YYYY-MM-DD]`

---

## Procedimentos de Monitoramento Pós-Lançamento

Após o lançamento em produção, os seguintes procedimentos de monitoramento devem ser implementados e revisados continuamente:

1.  **Monitoramento Ativo do Painel:**
    *   O `MonitoringDashboard` no AudiCare deve ser verificado regularmente para quaisquer anomalias em latência, throughput ou erros.
    *   Verificar a conexão do WebSocket no `APIDebugPanel` diariamente.
2.  **Verificação de Logs:**
    *   Monitorar os logs das Edge Functions relacionadas ao WhatsApp (ex: `send-zapi-message`, `zapi-webhook`) no Supabase para erros ou anomalias.
    *   Revisar logs de integração no banco de dados (`integration_logs`) para falhas no processamento de mensagens.
3.  **Alertas Configurados:**
    *   Confirmar que os sistemas de alerta (para instâncias offline, alta taxa de erros) estão ativos e funcionando, com notificações direcionadas à equipe de plantão.
4.  **Testes de Sanidade (Smoke Tests) Agendados:**
    *   Executar o `WhatsAppIntegrationValidator` diariamente ou a cada nova implantação para garantir que a funcionalidade básica ainda esteja intacta.
5.  **Feedback do Usuário:**
    *   Monitorar ativamente o feedback dos usuários sobre problemas relacionados ao WhatsApp e priorizar a resolução.
6.  **Performance:**
    *   Acompanhar as métricas de performance (tempos de resposta) continuamente para detectar degradação e otimizar proativamente.

---