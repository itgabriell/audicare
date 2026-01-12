# Lista de Verificação de Validação (Validation Checklist)

Esta lista detalha os passos para garantir a correta integração e funcionamento de todos os componentes do sistema AudiCare, com foco nas funcionalidades de mensagens e conectividade.

## 1. Validação da Conectividade do Backend

**Objetivo:** Garantir que o frontend possa se comunicar de forma confiável com o serviço de backend (`api.audicarefono.com.br`).

*   **1.1. Teste de Health Check:**
    *   [ ] Abrir o "API Debug Panel" (canto inferior direito da Inbox).
    *   [ ] Navegar para a aba "Status & Webhooks".
    *   [ ] Verificar o status da "Conexão Realtime". Deve estar "Conectado".
    *   [ ] No "Integration Test Panel" (canto inferior esquerdo da Inbox), executar o teste `health_check`.
    *   [ ] **Esperado:** Teste `health_check` passa com status `success` (`connected: true` na resposta).
    *   [ ] **Esperado:** O indicador de "Connection Status" no cabeçalho da Inbox (canto superior direito) mostra "Online".
*   **1.2. Latência da Rede:**
    *   [ ] No "API Debug Panel", observar os tempos de duração (`duration`) nas respostas de requisições.
    *   [ ] **Esperado:** Latência consistente e baixa (geralmente < 200ms para requisições internas).
*   **1.3. Logs de Requisições/Respostas:**
    *   [ ] No "API Debug Panel", verificar a aba "Logs Live" para garantir que as requisições e respostas estão sendo registradas corretamente (status `200 OK`, etc.).

## 2. Validação da Instância UAZAPI

**Objetivo:** Confirmar que a instância do WhatsApp está ativa e pronta para enviar/receber mensagens através do UAZAPI via backend.

*   **2.1. Status da Instância:**
    *   [ ] No "Connection Status" do cabeçalho da Inbox, verificar se a indicação é "Online".
    *   [ ] **Esperado:** Se o status for "Instável" (Amarelo) e a descrição mencionar "WhatsApp Instance Disconnected", a instância UAZAPI está com problemas (provavelmente precisa escanear o QR Code novamente).
*   **2.2. Teste de Envio de Mensagem:**
    *   [ ] No "Integration Test Panel", executar o teste `send_message`.
    *   [ ] **Esperado:** O teste `send_message` passa com status `success`.
    *   [ ] **Esperado:** A mensagem de teste é recebida no número de WhatsApp configurado (o número de teste).
*   **2.3. Teste de Webhook (Simulado):**
    *   [ ] No "Integration Test Panel", executar o teste `simulate_webhook`.
    *   [ ] **Esperado:** O teste `simulate_webhook` passa com status `success`.
    *   [ ] **Esperado:** A mensagem simulada aparece na Inbox (na conversa do contato de teste) em tempo real.

## 3. Validação do Fluxo de Mensagens End-to-End

**Objetivo:** Testar o envio, recebimento e exibição de mensagens, incluindo tratamento de status e real-time.

*   **3.1. Envio de Mensagem (Frontend -> Backend -> UAZAPI):**
    *   [ ] Na Inbox, selecione uma conversa e envie uma mensagem de texto (Ex: "Olá, teste!").
    *   [ ] **Esperado:** A mensagem aparece imediatamente na janela de chat com status "Enviando", muda para "Enviada" (check único), e para "Entregue" (dois checks).
    *   [ ] **Esperado:** A mensagem é recebida no aparelho WhatsApp do contato.
*   **3.2. Recebimento de Mensagem (UAZAPI -> Webhook -> Backend -> Supabase -> Realtime -> Frontend):**
    *   [ ] Responda à mensagem enviada no passo 3.1 do aparelho WhatsApp do contato.
    *   [ ] **Esperado:** A resposta aparece na janela de chat da Inbox em tempo real.
    *   [ ] **Esperado:** A conversa na lista (ConversationList) é atualizada com a nova mensagem e, se for o caso, o contador de não lidas aumenta.
*   **3.3. Status de Mensagem (Entregue/Lida):**
    *   [ ] Certifique-se de que a mensagem enviada do passo 3.1 seja lida no aparelho WhatsApp do contato.
    *   [ ] **Esperado:** O status da mensagem na janela de chat da Inbox (dois checks azuis) é atualizado para "Lida".
*   **3.4. Cache e Persistência:**
    *   [ ] Feche o navegador e reabra-o.
    *   [ ] **Esperado:** As conversas e mensagens previamente carregadas (se no cache) devem carregar rapidamente, e depois serem sincronizadas com o estado atual do servidor.

## 4. Validação de Cenários de Erro e Offline

**Objetivo:** Verificar como o sistema lida com condições adversas.

*   **4.1. Modo Offline e Fila de Mensagens:**
    *   [ ] Desconecte sua máquina da internet.
    *   [ ] No "Integration Test Panel", execute o teste `simulate_offline`.
    *   [ ] **Esperado:** O teste passa, indicando que uma mensagem foi enfileirada.
    *   [ ] Reconecte sua máquina à internet.
    *   [ ] **Esperado:** A mensagem enfileirada é enviada automaticamente e o status de sincronização mostra o processamento da fila.
*   **4.2. Falha de Autenticação:**
    *   [ ] Tente realizar um logout e um login com credenciais inválidas.
    *   [ ] **Esperado:** Uma mensagem de erro clara aparece (`toast` destrutivo).
*   **4.3. Falha de Conexão com o Backend (Simulado):**
    *   [ ] (Se possível, desligue o serviço de backend temporariamente)
    *   [ ] **Esperado:** O indicador de "Connection Status" muda para "Offline" e o "API Debug Panel" registra erros de conexão.
    *   [ ] **Esperado:** Mensagens enviadas são enfileiradas e não enviadas.
    *   [ ] (Ligue o serviço de backend novamente)
    *   [ ] **Esperado:** O sistema se recupera, o status muda para "Online" e as mensagens enfileiradas são processadas.

## 5. Validação de Performance

**Objetivo:** Garantir que a aplicação responde de forma fluida.

*   **5.1. Carregamento da Inbox:**
    *   [ ] Abrir a Inbox com um grande número de conversas (se disponível).
    *   [ ] **Esperado:** A lista de conversas carrega rapidamente (usando cache inicialmente e depois atualizando).
*   **5.2. Abertura de Conversa:**
    *   [ ] Clicar em uma conversa com muitas mensagens.
    *   [ ] **Esperado:** As mensagens são carregadas de forma otimizada (ex: carregando as mais recentes primeiro ou usando o cache local).
*   **5.3. Scroll e Interatividade:**
    *   [ ] Navegar pelas listas de conversas e mensagens.
    *   [ ] **Esperado:** A UI responde de forma suave, sem engasgos ou atrasos.
*   **5.4. Uso de Recursos:**
    *   [ ] Monitorar o uso de CPU e memória do navegador (Ferramentas do Desenvolvedor) durante o uso intensivo.
    *   [ ] **Esperado:** Uso razoável e estável de recursos.

## 6. Security Checklist

*   **6.1. Autenticação JWT:**
    *   [ ] Todos os endpoints de API estão protegidos por autenticação JWT.
    *   [ ] Tokens expirados ou inválidos resultam em `401 Unauthorized`.
*   **6.2. Autorização (RLS):**
    *   [ ] As políticas de Row Level Security (RLS) no Supabase estão ativas e corretamente configuradas para todas as tabelas sensíveis (e.g., `messages`, `conversations`, `patients`).
    *   [ ] Usuários só podem acessar dados pertencentes à sua `clinic_id`.
*   **6.3. Validação de Entrada:**
    *   [ ] Todas as entradas de usuário e parâmetros de API são validados no backend para prevenir SQL injection, XSS e outros ataques.
*   **6.4. Segredos de API:**
    *   [ ] Todas as chaves de API sensíveis (UAZAPI, etc.) são armazenadas como Supabase Secrets e nunca expostas no frontend ou em logs.
*   **6.5. Proteção contra CSRF:**
    *   [ ] O sistema está protegido contra ataques Cross-Site Request Forgery (CSRF) onde aplicável (geralmente gerenciado automaticamente por frameworks modernos).
*   **6.6. HTTPS:**
    *   [ ] Toda a comunicação (frontend-backend, backend-UAZAPI, frontend-Supabase) ocorre via HTTPS.

## 7. Monitoring & Logging Guide

*   **7.1. Frontend Logging:**
    *   [ ] `API Debug Panel` registra todas as requisições/respostas HTTP.
    *   [ ] Erros críticos no frontend são capturados pelo `ErrorBoundary` e logados no console.
*   **7.2. Backend Logging:**
    *   [ ] Supabase Edge Functions logs estão configurados para registrar eventos importantes (envio de mensagens, webhooks recebidos, erros).
    *   [ ] Logs são monitorados para anomalias e erros (e.g., via Supabase dashboard).
*   **7.3. Métricas de Performance:**
    *   [ ] Tempo de resposta dos endpoints do backend é monitorado.
    *   [ ] Utilização de recursos do servidor (CPU, memória) é acompanhada.
*   **7.4. Alertas:**
    *   [ ] Alertas configurados para falhas críticas de sistema (e.g., UAZAPI offline, erros 5xx persistentes no backend).

## 8. Final Sign-off Checklist for Production Deployment

*   **8.1. Funcionalidade:**
    *   [ ] Todos os testes da "Validação do Fluxo de Mensagens End-to-End" passaram.
    *   [ ] Todos os cenários de erro e offline foram testados com sucesso.
*   **8.2. Performance:**
    *   [ ] A aplicação atende aos benchmarks de performance estabelecidos.
    *   [ ] Não há vazamentos de memória ou alto uso de CPU no navegador durante o uso prolongado.
*   **8.3. Segurança:**
    *   [ ] Todas as verificações do "Security Checklist" foram aprovadas.
    *   [ ] Auditoria de segurança concluída (se aplicável).
*   **8.4. Configuração:**
    *   [ ] Todas as variáveis de ambiente de produção estão corretamente configuradas (Supabase URLs/Keys, UAZAPI credentials, etc.).
    *   [ ] Configurações de CORS do backend estão ajustadas para o domínio de produção.
*   **8.5. Monitoramento:**
    *   [ ] Ferramentas de monitoramento e logging estão ativas e configuradas para o ambiente de produção.
    *   [ ] Alertas estão configurados e testados.
*   **8.6. Documentação:**
    *   [ ] `INTEGRATION_SUMMARY.md` e `TROUBLESHOOTING.md` estão atualizados e acessíveis.
    *   [ ] `VALIDATION_CHECKLIST.md` está completo e assinado.
*   **8.7. Backup e Recuperação:**
    *   [ ] Planos de backup e recuperação de desastres estão em vigor para o Supabase.

---
**Assinatura de Aprovação para Produção:**

Nome: _________________________

Data: _________________________