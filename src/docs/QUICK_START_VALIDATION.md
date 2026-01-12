# Guia de Validação Rápida (Quick Start Validation Guide)

Este guia fornece um procedimento de validação de 5 minutos para garantir que o sistema AudiCare (módulo Inbox/WhatsApp) está operacional e pronto para uso após uma implantação ou atualização.

**Objetivo:** Verificar a conectividade, autenticação, envio/recebimento de mensagens e funcionalidade em tempo real.

---

## 5-Minutos Procedimento de Validação

### Pré-requisitos
*   Um usuário autenticado no sistema.
*   Acesso ao Painel de Validação (`/inbox` > ícone de Inseto).
*   Acesso ao Painel de Configuração (`/inbox` > ícone de Engrenagem).
*   Um número de WhatsApp de teste configurado na instância UAZAPI (para receber e enviar mensagens de teste).

---

### Passo 1: Verificar Saúde do Backend e UAZAPI

**Procedimento:**
1.  Navegue para a página `/inbox`.
2.  Clique no **ícone de Engrenagem** (Configurações) no canto superior direito para abrir o `ConfigurationPanel`.
3.  Vá para a aba "Conectividade".
4.  Clique no botão "Verificar Agora".

**Resultados Esperados:**
*   Todos os endpoints listados (`Backend API`, `UAZAPI Status`, `WhatsApp Contacts`) devem exibir um ícone de ✅ (verde) e status `ok`.
*   A latência deve ser menor que 500ms.
*   Se "UAZAPI Status" mostrar `auth_error` (amarelo), significa que o endpoint está acessível, mas a autenticação pode precisar ser verificada (normal se a sessão não estiver ativa). Se mostrar `unreachable` (vermelho), há um problema de conectividade.

**Troubleshooting:**
*   **`unreachable` / Latência alta:** Verifique a rede, status da Edge Function no Supabase, ou firewall.
*   **`auth_error` persistente:** Logout e login novamente. Verifique se o token JWT está sendo enviado.

---

### Passo 2: Validar Token JWT

**Procedimento:**
1.  No `ConfigurationPanel`, vá para a aba "Autenticação".
2.  Verifique a seção "Token JWT Atual".

**Resultados Esperados:**
*   Deve haver um token JWT exibido.
*   O status JWT deve ser "Válido" (verde).
*   A data de expiração deve estar no futuro.

**Troubleshooting:**
*   **"Nenhum token ativo" / Expirado:** Faça logout e login novamente. Se o problema persistir, pode indicar um problema de configuração de autenticação do Supabase.

---

### Passo 3: Enviar Mensagem de Teste (Outbound)

**Procedimento:**
1.  Navegue para a página `/inbox`.
2.  Selecione a conversa com o número de WhatsApp de teste (ou crie uma nova).
3.  Envie uma mensagem de texto simples (ex: "Teste de envio de mensagem [timestamp]") para este contato.

**Resultados Esperados:**
*   A mensagem deve aparecer no ChatWindow com status "sending" -> "sent" -> "delivered" -> "read".
*   O telefone de teste deve receber a mensagem.
*   Você deve ver os indicadores de entrega (tiques) mudarem.

**Troubleshooting:**
*   **Mensagem presa em "sending":** Verifique os logs do console para erros da API de envio. Verifique o status da Edge Function `send-zapi-message`.
*   **Erro ao enviar:** Verifique o `APIDebugPanel` (no canto inferior esquerdo) para ver a resposta bruta da API. O UAZAPI pode estar desconectado.

---

### Passo 4: Verificar Mensagem Recebida (Inbound)

**Procedimento:**
1.  No telefone de teste, responda à mensagem enviada no Passo 3 (ex: "Recebido e respondendo [timestamp]").
2.  Observe o `ChatWindow` no sistema AudiCare.

**Resultados Esperados:**
*   A nova mensagem deve aparecer automaticamente no `ChatWindow` em tempo real.
*   O ícone de notificação (sino) pode tocar e/ou exibir um badge de mensagem não lida.
*   No `MonitoringDashboard` (ícone de Atividade no topo), a métrica "Eventos Recebidos" em "Webhook Stats" deve aumentar.

**Troubleshooting:**
*   **Mensagem não aparece:** Verifique se o webhook do UAZAPI está configurado corretamente para o Supabase Edge Function (`zapi-webhook`).
*   **Realtime não funciona:** Verifique no `MonitoringDashboard` se o "Webhook Stats" está conectado.
*   **Erro no `zapi-webhook`:** Verifique os logs da Edge Function `zapi-webhook` no painel do Supabase.

---

### Passo 5: Validar Sincronização em Tempo Real (UI)

**Procedimento:**
1.  Após receber a mensagem no Passo 4, observe a `ConversationList` na lateral esquerda.

**Resultados Esperados:**
*   A conversa com o contato de teste deve subir para o topo da lista (ou ter seu `last_message_at` atualizado).
*   Se a mensagem foi recebida quando a conversa não estava ativa, o `unread_count` deve ser incrementado.

**Troubleshooting:**
*   **UI não atualiza:** Verifique se o `webhookReceiverService` está ativo e conectado (no `MonitoringDashboard` > aba "Integração").

---

### Passo 6: Validar Modo Offline e Reconexão

**Procedimento:**
1.  Desligue sua conexão com a internet (Wi-Fi, cabo) ou simule modo offline no navegador.
2.  No `ChatWindow`, envie uma nova mensagem para o contato de teste.
3.  Observe a mensagem e o `ConnectionStatus` (ícone de rede no topo).
4.  Religue a conexão com a internet.

**Resultados Esperados:**
*   Quando offline, a mensagem deve aparecer no `ChatWindow` com status "queued" (na fila) ou "sending" (aguardando).
*   O `ConnectionStatus` deve mudar para "Offline" (vermelho).
*   Após reconectar, o `ConnectionStatus` deve retornar para "Conectado" (verde).
*   A mensagem em fila deve ser enviada automaticamente e seu status deve ser atualizado para "sent" / "delivered".
*   O `ValidationTestPanel` (Testes > `offline_queue`) deve mostrar a fila vazia após a reconexão.

**Troubleshooting:**
*   **Mensagem não enviada após reconexão:** Verifique os logs do `healthCheckService` para erros ao processar a fila offline.

---

### Passo 7: Verificar Atualização de Status de Entrega (Tiques) e Lida

**Procedimento:**
1.  Envie uma mensagem do sistema AudiCare para o telefone de teste.
2.  Observe os tiques de entrega (dois cinzas para entregue, dois azuis para lida) no `ChatWindow` em tempo real.

**Resultados Esperados:**
*   Os tiques devem mudar de um para dois cinzas após a entrega.
*   Após o usuário no telefone de teste ler a mensagem, os tiques devem mudar para dois azuis.

**Troubleshooting:**
*   **Status de entrega não atualiza:** Verifique o webhook da UAZAPI para `message_status` eventos. A Edge Function `zapi-webhook` deve estar processando esses eventos.

---

## Critérios de Sucesso

Todos os passos acima foram executados com sucesso e os "Resultados Esperados" foram confirmados para cada etapa. O sistema deve estar respondendo rapidamente, sem erros visíveis na UI e com todas as funcionalidades de mensagens ativas.

---

## Recuperação de Falhas (Procedimentos Gerais)

*   **Problemas de Conectividade:**
    *   Verifique a conectividade da rede local e do servidor (ping, traceroute).
    *   Confirme se a instância UAZAPI está ativa e conectada ao WhatsApp.
    *   Reinicie a instância UAZAPI via o endpoint `/wa/restart` se necessário.
*   **Erros de Autenticação:**
    *   Limpe o cache do navegador e tente fazer login novamente.
    *   Verifique as configurações de autenticação do Supabase.
*   **Mensagens Não Entregues/Recebidas:**
    *   Revise os logs das Edge Functions `send-zapi-message` e `zapi-webhook` no painel do Supabase.
    *   Confirme que os Webhooks da UAZAPI estão apontando para a URL correta das Edge Functions.
*   **Realtime Não Funciona:**
    *   Verifique o status do Supabase Realtime (no painel do Supabase).
    *   Verifique erros no console do navegador relacionados à conexão WebSocket.

---

## Expectativas de Performance (Baseline)

*   **Latência de API (pings):** < 300ms
*   **Tempo de Envio de Mensagem (UI para entregue):** < 3 segundos
*   **Tempo de Recebimento de Mensagem (UAZAPI para UI):** < 2 segundos
*   **Carregamento de Conversa (50 mensagens):** < 1 segundo

---

## Validação de Segurança (Passos Adicionais)

*   **RLS (Row Level Security):** Tente acessar dados de uma clínica diferente com um usuário autenticado (deve falhar).
*   **Tokens:** Verifique se o token JWT é válido e não excede seu tempo de vida.
*   **Secrets:** Confirme que nenhuma chave sensível está exposta no código frontend ou logs.

---

## Configuração de Monitoramento (Pós-Validação)

*   O `MonitoringDashboard` (acessível no `/inbox` > ícone de Atividade) deve ser usado para monitorar contínua do sistema.
*   Configurar alertas no Supabase para falhas de Edge Functions e altos volumes de erros.

---

## Modelo de Relatório de Validação