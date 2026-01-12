# Lista de Verificação de Validação de Integração Final (Final Integration Validation Checklist)

Este documento detalha a lista de verificação de validação final para o sistema AudiCare (módulo Inbox/WhatsApp) antes do lançamento em produção. O objetivo é garantir que todas as integrações, funcionalidades e aspectos de segurança e performance estejam operacionais e dentro das expectativas.

**Versão da Aplicação:** `[Preencher]`
**Data de Validação:** `[Preencher]`
**Ambiente:** `[Produção/Staging]`
**Equipe de Validação:** `[Preencher]`

---

## I. Verificação de Configuração Essencial

### 1. Verificação da URL do Backend
*   **Descrição:** Garantir que a aplicação frontend está apontando para o endpoint correto do backend API.
*   **Procedimento:**
    1.  Acessar o `ConfigurationPanel` (`/inbox` > ⚙️).
    2.  Navegar até a seção "Variáveis de Ambiente".
    3.  Verificar o valor de `API_BASE_URL`.
*   **Resultado Esperado:** `API_BASE_URL` deve ser `https://api.audicarefono.com.br/api` (ou o URL de staging apropriado).
*   **Troubleshooting:** Se incorreto, verificar as variáveis de ambiente `VITE_API_BASE_URL` no `.env` do projeto e no ambiente de deploy.

### 2. Verificação da Configuração da UAZAPI
*   **Descrição:** Confirmar que as credenciais da UAZAPI (ou outro provedor de WhatsApp) estão corretamente configuradas no backend (Supabase Edge Functions/Secrets).
*   **Procedimento:**
    1.  No `ConfigurationPanel` (`/inbox` > ⚙️), na aba "Conectividade", clicar em "Verificar Agora".
    2.  Observar o status da `UAZAPI Status` e `WhatsApp Contacts`.
*   **Resultado Esperado:** Ambos devem exibir ✅ `ok` (verde). Um status de `auth_error` (amarelo) para UAZAPI Status indica que o endpoint está acessível, mas pode haver um problema de autenticação/sessão na própria instância do WhatsApp. `unreachable` (vermelho) é crítico.
*   **Troubleshooting:**
    *   `auth_error`: Verificar as chaves `Z_API_KEY`, `Z_API_SECURITY_TOKEN` no Supabase Secrets. Certificar-se de que a instância da UAZAPI está ativa e conectada ao WhatsApp.
    *   `unreachable`: Verificar a conectividade do servidor, firewall, ou se a UAZAPI está online.

### 3. Validação da Autenticação JWT
*   **Descrição:** Confirmar que o token JWT do usuário está sendo gerado e validado corretamente.
*   **Procedimento:**
    1.  Acessar o `ConfigurationPanel` (`/inbox` > ⚙️).
    2.  Navegar até a seção "Autenticação".
    3.  Verificar "Token JWT Atual" e "Status JWT".
*   **Resultado Esperado:** Um token JWT válido deve ser exibido e o "Status JWT" deve ser "Válido" (verde) com uma data de expiração no futuro.
*   **Troubleshooting:** Se "Nenhum token ativo" ou "Expirado", realizar logout e login novamente. Problemas persistentes podem indicar falha na configuração do Supabase Auth ou políticas de RLS.

---

## II. Validação de Endpoints da API

### 4. Validação do Endpoint de Health-Check (`/wa/health-check`)
*   **Descrição:** Verificar se o endpoint de saúde do WhatsApp do backend está respondendo corretamente.
*   **Procedimento:**
    1.  Acessar o `APIDebugPanel` (`/inbox` > clicar no botão "API Debug" na parte inferior esquerda).
    2.  Selecionar método `GET`, URL `/wa/health-check`.
    3.  Clicar em "Enviar Requisição".
*   **Resultado Esperado:** Status 200 OK e resposta JSON indicando `connected: true` ou `status: "connected"`.
*   **Troubleshooting:** Erros 5xx indicam falha no backend (Supabase Edge Function `zapi-health-check`). Erros 4xx podem ser problemas de autenticação.

### 5. Validação do Endpoint de Envio de Texto (`/wa/send-text`)
*   **Descrição:** Testar o envio de mensagens de texto através do backend.
*   **Procedimento:**
    1.  Acessar o `APIDebugPanel`.
    2.  Selecionar método `POST`, URL `/wa/send-text`.
    3.  No corpo da requisição, usar `{"to": "+55DDNNNNNNNNN", "text": "Teste de integração AudiCare"}` com um número de WhatsApp válido.
    4.  Clicar em "Enviar Requisição".
*   **Resultado Esperado:** Status 200 OK e resposta JSON com `messageId` e `status: "success"`. A mensagem deve ser recebida no celular de teste.
*   **Troubleshooting:** Erros indicam problema na Edge Function `send-zapi-message`, comunicação com UAZAPI, ou formato inválido do número.

### 6. Validação do Webhook Receiver
*   **Descrição:** Confirmar que o Supabase Edge Function `zapi-webhook` está recebendo e processando corretamente os eventos da UAZAPI.
*   **Procedimento:**
    1.  Abrir o `Dashboard de Monitoramento` (`/inbox` > 📈).
    2.  Ir para a aba "Integração" e observar "Webhook Stats".
    3.  Enviar uma mensagem do celular de teste para o número de WhatsApp integrado.
*   **Resultado Esperado:** Os contadores de "Eventos Recebidos" e "Mensagens Processadas" em "Webhook Stats" devem aumentar em tempo real. A mensagem deve aparecer na UI da Inbox.
*   **Troubleshooting:** Se os contadores não aumentam, verificar a configuração do webhook na UAZAPI para apontar para a Edge Function correta e logs da Edge Function `zapi-webhook` no Supabase.

### 7. Validação do Endpoint de Contatos (`/wa/contacts`)
*   **Descrição:** Verificar se a aplicação pode buscar a lista de contatos do WhatsApp.
*   **Procedimento:**
    1.  Acessar o `APIDebugPanel`.
    2.  Selecionar método `GET`, URL `/wa/contacts`.
    3.  Clicar em "Enviar Requisição".
*   **Resultado Esperado:** Status 200 OK e resposta JSON com uma lista de contatos.
*   **Troubleshooting:** Se lista vazia ou erro, verificar configuração da UAZAPI e permissões.

### 8. Validação do Endpoint de Histórico de Conversa (`/wa/chat-history/:phone`)
*   **Descrição:** Garantir que o histórico de mensagens para um contato específico pode ser recuperado.
*   **Procedimento:**
    1.  Acessar o `APIDebugPanel`.
    2.  Selecionar método `GET`, URL `/wa/chat-history/+55DDNNNNNNNNN` (substituir pelo número de teste).
    3.  Clicar em "Enviar Requisição".
*   **Resultado Esperado:** Status 200 OK e resposta JSON com o histórico de mensagens do contato.
*   **Troubleshooting:** Erros indicam falha na Edge Function, problema de cache, ou número de telefone inválido/sem histórico.

---

## III. Validação de Funcionalidades de Mensagens

### 9. Validação de Entrega de Mensagens (Outbound)
*   **Descrição:** Confirmar que as mensagens enviadas da AudiCare são entregues com sucesso ao destinatário e que os status são atualizados.
*   **Procedimento:**
    1.  Na Inbox, enviar uma mensagem de texto para o número de teste.
    2.  Observar o status da mensagem na `ChatWindow` (enviando -> enviado -> entregue -> lido).
    3.  Verificar no celular de teste a recepção da mensagem e os tiques de entrega/leitura.
*   **Resultado Esperado:** A mensagem deve ser entregue e os status na UI da AudiCare devem progredir até "lido" (dois tiques azuis) após a leitura no celular.
*   **Troubleshooting:**
    *   Presa em "enviando": Problema de rede ou Edge Function `send-zapi-message`.
    *   Presa em "enviado": Problema na comunicação UAZAPI-WhatsApp.
    *   Tiques não atualizam: Webhook da UAZAPI para `message_status` não configurado ou `zapi-webhook` Edge Function falhando ao processar.

### 10. Validação de Recepção de Mensagens (Inbound)
*   **Descrição:** Confirmar que as mensagens enviadas para o número de WhatsApp integrado são recebidas e exibidas na AudiCare.
*   **Procedimento:**
    1.  Do celular de teste, enviar uma mensagem para o número de WhatsApp integrado.
    2.  Observar a `ChatWindow` na AudiCare.
*   **Resultado Esperado:** A mensagem deve aparecer na `ChatWindow` em tempo real. A conversa deve ser marcada como não lida (se não estiver ativa) e subir no `ConversationList`.
*   **Troubleshooting:** Webhook da UAZAPI não configurado corretamente, `zapi-webhook` Edge Function com falha, ou problemas de Realtime.

### 11. Validação de Sincronização em Tempo Real da UI
*   **Descrição:** As atualizações na conversa (recebimento de mensagens, leitura) devem refletir-se instantaneamente na interface do usuário.
*   **Procedimento:**
    1.  Manter a `ChatWindow` aberta e ativa.
    2.  Enviar mensagens de/para o número de teste.
    3.  Do celular, ler uma mensagem enviada pela AudiCare.
*   **Resultado Esperado:** As mensagens devem aparecer imediatamente. Os tiques de leitura devem mudar para azul quase instantaneamente. A `ConversationList` deve ser reordenada e os contadores de não lidas devem ser atualizados.
*   **Troubleshooting:** Problemas com o Realtime do Supabase, `webhookReceiverService` inoperante, ou latência alta na rede.

### 12. Validação do Modo Offline e Fila de Mensagens
*   **Descrição:** Testar a capacidade do sistema de enfileirar mensagens quando offline e enviá-las automaticamente ao reconectar.
*   **Procedimento:**
    1.  Desconectar a internet do navegador/máquina (ou usar o modo "Offline" nas DevTools do Chrome).
    2.  Na `ChatWindow`, digitar e tentar enviar 2-3 mensagens.
    3.  Observar o status das mensagens e o `ConnectionStatus` (ícone no cabeçalho da Inbox).
    4.  Reconectar a internet.
*   **Resultado Esperado:**
    *   As mensagens devem ser exibidas com status "queued" (enfileirada) ou "sending" (aguardando) na `ChatWindow`.
    *   O `ConnectionStatus` deve mostrar "Offline" (vermelho).
    *   Após a reconexão, o `ConnectionStatus` deve voltar para "Online" (verde).
    *   As mensagens enfileiradas devem ser enviadas automaticamente e seus status atualizados para "sent"/"delivered".
*   **Troubleshooting:** Se mensagens não são enviadas após reconexão, verificar `healthCheckService.offlineQueue` e a lógica de retry em `whatsappService.sendText`.

### 13. Validação de Tratamento de Erros na UI
*   **Descrição:** Verificar se o sistema exibe mensagens de erro claras e úteis ao usuário.
*   **Procedimento:**
    1.  Simular erros (ex: tentar enviar mensagem sem internet, usar um número de telefone inválido no API Debug Panel, forçar um erro 500 no backend se possível).
    2.  Observar as notificações `toast` e os componentes de `ErrorDisplay`.
*   **Resultado Esperado:** Mensagens de erro informativas devem ser mostradas, orientando o usuário sobre o problema (ex: "Sem conexão com a internet", "Número de telefone inválido", "Erro ao enviar").

---

## IV. Validação de Segurança

### 14. Checklist de Auditoria de Segurança
*   **Descrição:** Assegurar que o sistema está em conformidade com as práticas de segurança.
*   **Procedimento & Critérios:**
    *   **RLS (Row Level Security):**
        *   Tentar acessar dados de uma clínica diferente com um usuário autenticado (deve falhar).
        *   Verificar logs de RLS no Supabase para negações inesperadas.
    *   **Tokens (JWT):**
        *   Confirmar que os tokens JWT têm tempo de vida adequado (não muito longo, não muito curto).
        *   Verificar que o token não é acessível em logs ou URLs.
    *   **Supabase Secrets:**
        *   Garantir que todas as chaves sensíveis (API keys, tokens UAZAPI) estão armazenadas no Supabase Secrets e não hardcoded.
    *   **Validação de Entrada:**
        *   Tentar injetar scripts (XSS) em campos de texto (ex: nome do contato, conteúdo da mensagem).
        *   Verificar se a validação de formato de telefone (E.164) está ativa no frontend e backend.
    *   **HTTPS/SSL:**
        *   Garantir que todas as comunicações são via HTTPS.
    *   **Autorização de Nível de Feature:**
        *   Verificar se usuários com diferentes papéis (ex: admin, médico, recepcionista) têm acesso apenas às funcionalidades e dados apropriados.

---

## V. Performance e Monitoramento

### 15. Validação de Baseline de Performance
*   **Descrição:** Confirmar que o sistema atende aos critérios mínimos de performance.
*   **Procedimento:**
    1.  Abrir o `Dashboard de Monitoramento` (`/inbox` > 📈).
    2.  Realizar ações comuns (envio de mensagem, carregamento de histórico).
*   **Resultado Esperado:**
    *   **Latência de API (pings):** < 300ms.
    *   **Tempo de Envio de Mensagem (UI para entregue):** < 3 segundos.
    *   **Tempo de Recepção de Mensagem (UAZAPI para UI):** < 2 segundos.
    *   **Carregamento de Conversa (50 mensagens):** < 1 segundo.
*   **Troubleshooting:** Latências acima do esperado podem indicar sobrecarga no backend, problemas de rede, ou ineficiência nas queries.

### 16. Validação da Configuração de Monitoramento
*   **Descrição:** Assegurar que as ferramentas de monitoramento estão ativas e configuradas para alertar sobre anomalias.
*   **Procedimento:**
    1.  Verificar o `Dashboard de Monitoramento` (`/inbox` > 📈) para garantir que as métricas estão sendo coletadas (Latência, Throughput, Webhook Stats).
    2.  Confirmar que alertas (ex: para falhas de Edge Function, erros 5xx na API) estão configurados no Supabase ou sistema de monitoramento externo.
*   **Resultado Esperado:** Todas as métricas no dashboard devem ser atualizadas dinamicamente. Alertas devem estar prontos para disparar em caso de falhas.

### 17. Validação de Logging
*   **Descrição:** Garantir que os logs estão sendo gerados corretamente para depuração e auditoria.
*   **Procedimento:**
    1.  Realizar várias ações no sistema (login, envio/recebimento de mensagens).
    2.  Verificar os logs do navegador (F12 > Console) e os logs das Edge Functions no Supabase.
*   **Resultado Esperado:** Logs informativos e de erro devem ser gerados em momentos apropriados, com detalhes suficientes para diagnosticar problemas. Chaves sensíveis não devem aparecer em logs.

---

## VI. Sign-off e Escalada

### 18. Modelo de Relatório de Validação Final