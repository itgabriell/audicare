# Guia Completo de Ferramentas de Depuração (Debug Tools Guide)

Este documento serve como referência central para todas as ferramentas de diagnóstico, monitoramento e teste integradas ao sistema AudiCare. Estas ferramentas foram projetadas para permitir que desenvolvedores e administradores identifiquem e resolvam problemas rapidamente em produção.

---

## 1. Visão Geral das Ferramentas

O sistema possui 5 painéis principais de diagnóstico, acessíveis primariamente através da página de **Inbox** (`/inbox`):

1.  **Painel de Configuração:** Validação de ambiente e conectividade básica.
2.  **Dashboard de Monitoramento:** Métricas em tempo real de saúde do sistema e latência.
3.  **Painel de Validação:** Suíte de testes automatizados para lógica de negócios.
4.  **Painel de Testes de Integração:** Testes de fluxo ponta-a-ponta (E2E) manuais.
5.  **API Debug Panel:** Ferramenta para chamadas diretas (RAW) aos endpoints do backend.

---

## 2. Painel de Configuração (Configuration Panel)

**Acesso:** Ícone de **Engrenagem (⚙️)** no cabeçalho da Inbox.

**Funcionalidades:**
*   **Variáveis de Ambiente:** Lista chaves críticas (`VITE_SUPABASE_URL`, `API_BASE_URL`) e valida se estão preenchidas corretamente. Valores sensíveis são mascarados.
*   **Conectividade:** Executa "pings" em tempo real para o Backend API, Instância UAZAPI e WhatsApp.
*   **Autenticação:** Decodifica o token JWT atual, mostrando expiração e escopo.
*   **Auditoria:** Log local das ações realizadas no painel.

**Uso Típico:** Verificar se o sistema está apontando para o ambiente correto (Staging vs Prod) e se as chaves de API estão carregadas.

---

## 3. Dashboard de Monitoramento (Monitoring Dashboard)

**Acesso:** Ícone de **Atividade (📈)** no cabeçalho da Inbox.

**Funcionalidades:**
*   **Métricas de Saúde:** Indica se o sistema está `Online`, `Offline` ou `Degradado`.
*   **Latência de API:** Gráfico de linha mostrando o tempo de resposta das últimas requisições.
*   **Throughput:** Gráfico de área mostrando mensagens enviadas vs. recebidas por minuto.
*   **Webhook Stats:** Contadores de eventos recebidos em tempo real do WhatsApp.
*   **Fila Offline:** Monitora quantas mensagens estão aguardando reconexão para serem enviadas.

**Uso Típico:** Identificar lentidão no sistema ou falhas massivas na recepção de webhooks.

---

## 4. Painel de Validação (Validation Test Panel)

**Acesso:** Ícone de **Inseto (🐞)** no cabeçalho da Inbox.

**Funcionalidades:**
*   **Execução de Testes:** Roda scripts de validação (`src/utils/validationScript.js`) categorizados (Segurança, Rede, Dados).
*   **Detalhes de Erro:** Exibe stack traces completos e respostas JSON de falhas.
*   **Histórico:** Mantém um log das últimas 50 execuções de teste.
*   **Analytics:** Gráfico de barras mostrando a taxa de sucesso/falha ao longo do tempo.

**Uso Típico:** Validar o sistema após um deploy ("Smoke Test") ou diagnosticar qual módulo específico (Auth, DB, API) está falhando.

---

## 5. Painel de Testes de Integração (Integration Test Panel)

**Acesso:** Geralmente localizado na parte inferior da tela de Inbox (modo dev) ou via atalho específico.

**Funcionalidades:**
*   **Fluxos E2E:** Permite simular fluxos complexos, como "Criar Contato -> Enviar Mensagem -> Aguardar Resposta".
*   **Visualização de Estado:** Mostra o estado interno dos componentes durante o teste.

**Uso Típico:** Verificar se a integração completa entre Frontend, Backend e WhatsApp está funcionando como esperado.

---

## 6. API Debug Panel

**Acesso:** Botão "API Debug" ou painel colapsável na lateral/inferior da Inbox.

**Funcionalidades:**
*   **Cliente HTTP Integrado:** Interface para fazer requisições POST/GET manuais para os endpoints do sistema (`/wa/send-text`, `/wa/contacts`).
*   **Visualizador JSON:** Formata a resposta da API para fácil leitura.
*   **Headers Automáticos:** Injeta automaticamente o token de autenticação atual.

**Uso Típico:** Testar se um endpoint específico está respondendo corretamente, isolando problemas de UI.

---

## 7. Webhook Receiver Service

Este é um serviço de fundo (`src/services/webhookReceiverService.js`), mas seu status pode ser visualizado no **Dashboard de Monitoramento**.

**O que monitorar:**
*   **Eventos Recebidos:** Deve incrementar sempre que uma mensagem chega no celular.
*   **Erros:** Se este contador subir, verifique se o formato do payload do webhook mudou ou se há erros de validação de schema.

---

## 8. Atalhos de Teclado

*   **F12 / Ctrl+Shift+I:** Abrir Developer Tools do navegador (essencial para ver logs do console).
*   **Ctrl+F5:** Hard Refresh (limpa cache do navegador e recarrega a aplicação).
*   *(Futuro)*: Atalhos específicos como `Ctrl+Shift+D` para abrir o painel de debug podem ser implementados.

---

## 9. Como Acessar as Ferramentas

Todas as ferramentas estão concentradas na rota `/inbox`.
1.  Faça login no sistema.
2.  Navegue para "Caixa de Entrada" no menu lateral.
3.  Olhe para o canto superior direito, próximo ao status de conexão.
4.  Os ícones (Engrenagem, Atividade, Inseto) abrem os respectivos painéis.

---

## 10. Como Interpretar Resultados

*   **🟢 Verde / OK / Online:** Funcionamento normal.
*   **🟡 Amarelo / Warning / Auth Error:** Funcionalidade parcial. Ex: API acessível mas requer login; Latência alta (>500ms).
*   **🔴 Vermelho / Error / Offline:** Falha crítica. Endpoint inacessível, serviço parado ou erro 500.

---

## 11. Como Exportar Dados de Debug

Nos painéis de **Configuração** e **Validação**, procure pelo botão **"Exportar" (📥)**.
*   Isso gerará um arquivo `.json` contendo o estado atual, logs e resultados dos testes.
*   **Atenção:** O arquivo pode conter informações parciais de configuração, mas chaves sensíveis são geralmente mascaradas.

---

## 12. Compartilhando Relatórios

Ao reportar um bug para a equipe de desenvolvimento:
1.  Abra o **Painel de Validação**.
2.  Execute "Todos os Testes".
3.  Clique em "Exportar".
4.  Anexe o arquivo JSON ao ticket de suporte ou envie via Slack/Email.
5.  Inclua também um print do **Dashboard de Monitoramento** se houver problemas de performance.

---

## 13. Guia de Perfil de Performance

1.  Abra o **Dashboard de Monitoramento**.
2.  Observe o gráfico "Latência API".
3.  Realize a ação lenta (ex: enviar mensagem).
4.  Veja se há um pico no gráfico.
    *   **Pico alto:** Problema no Backend ou Rede.
    *   **Sem pico:** Problema de renderização no Frontend (React).

---

## 14. Guia de Inspeção de Rede

Se as ferramentas internas não forem suficientes:
1.  Abra o DevTools (F12) > aba **Network**.
2.  Filtre por `Fetch/XHR`.
3.  Observe as chamadas para `api.audicarefono.com.br` ou funções do Supabase.
4.  Chamadas em vermelho (Status 4xx ou 5xx) indicam a causa raiz.
5.  Verifique a aba "Payload" para ver o que foi enviado e "Response" para ver o erro.

---

## 15. Guia de Logs do Console

O sistema utiliza um serviço de log centralizado (`debugService`). No console do navegador:
*   Procure por tags como `[WhatsApp]`, `[Auth]`, `[API]`.
*   Erros críticos aparecem em vermelho com `[Error]`.
*   Logs de fluxo normal aparecem como `[Info]` ou `[Debug]`.

---

## 16. Monitoramento de Eventos em Tempo Real

Para verificar se o Realtime do Supabase está ativo:
1.  Abra o DevTools > aba **Network** > filtro **WS** (WebSocket).
2.  Procure por conexões com `supabase.co`.
3.  Verifique se há tráfego de mensagens ("frames") quando você envia/recebe dados.
4.  No **Dashboard de Monitoramento**, a aba "Integração" mostra contadores de eventos processados.

---

## 17. Teste de Modo Offline

1.  Abra o DevTools > aba **Network**.
2.  No dropdown "No throttling", selecione **Offline**.
3.  Tente enviar uma mensagem na Inbox.
4.  Verifique se:
    *   O ícone de status muda para "Offline" (vermelho).
    *   A mensagem aparece como "Enfileirada" ou "Aguardando".
    *   A mensagem vai para a fila no **Dashboard de Monitoramento** > aba "Fila".
5.  Volte para "No throttling" e veja se a mensagem é enviada automaticamente.

---

## 18. Simulação de Erros

Para testar a resiliência do sistema:
*   **Erro de Rede:** Use o modo Offline do navegador.
*   **Erro de Auth:** Exclua o cookie/local storage `sb-<id>-auth-token` e tente navegar. O sistema deve redirecionar para login ou tentar refresh.
*   **Erro de API:** Use o **API Debug Panel** para enviar um payload inválido (ex: JSON malformado) e verifique se o sistema trata o erro 400 graciosamente.

---

## 19. Testes de Performance (Carga)

*   Use o **Painel de Validação** repetidamente.
*   Navegue rapidamente entre conversas para testar a virtualização da lista e o cache.
*   Monitore o uso de memória no **Dashboard de Monitoramento** > aba "Sistema".

---

## 20. Fluxograma de Troubleshooting