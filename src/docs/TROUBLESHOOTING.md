# Guia de Resolução de Problemas (Troubleshooting Guide)

Este documento fornece um guia para diagnosticar e resolver problemas comuns que podem ocorrer na plataforma AudiCare, especialmente na integração com o WhatsApp (UAZAPI) e o sistema de mensagens em tempo real.

## 1. Falhas no Health Check / Conectividade do Backend

**Sintomas:**
*   Indicador de status da conexão (canto superior direito da Inbox) mostra Vermelho (Offline) ou Amarelo (Instável).
*   Mensagens de erro como "Backend unreachable" ou "Timeout" no Debug Panel.

**Possíveis Causas e Soluções:**
*   **Rede local:**
    *   Verifique sua conexão com a internet.
    *   Reinicie seu roteador/modem.
    *   Tente acessar outros sites para confirmar conectividade geral.
*   **Problemas com o backend (`api.audicarefono.com.br`):**
    *   O serviço de backend pode estar inativo ou enfrentando problemas. Entre em contato com o suporte técnico.
    *   Verifique o "API Debug Panel" (`src/components/Debug/APIDebugPanel.jsx`) na aba "Logs Live" para ver o status das requisições ao `api.audicarefono.com.br/api/wa/status`.
*   **Firewall/Proxy:** Sua rede pode estar bloqueando a conexão com o backend.
    *   Verifique as configurações de firewall.
    *   Tente desativar temporariamente VPN ou proxy.
*   **Timeout:** A requisição de health check excedeu o tempo limite (padrão de 5 segundos para o check, 15 segundos para outras requisições).
    *   Isso pode indicar alta latência da sua conexão ou sobrecarga do servidor backend.

## 2. Falhas no Envio de Mensagens

**Sintomas:**
*   Mensagens enviadas permanecem com status "Enviando" (ícone de relógio ou roda girando).
*   Mensagens aparecem com status "Erro" (ícone de exclamação vermelho).
*   Mensagens não são entregues ao destinatário.

**Possíveis Causas e Soluções:**
*   **Conexão Offline:**
    *   Verifique o status da conexão (Health Check). Se offline, a mensagem será enfileirada e enviada automaticamente quando a conexão for restaurada.
    *   Confira o "Integration Test Panel" para simular o modo offline e verificar a fila de mensagens.
*   **Número de Telefone Inválido:**
    *   Verifique se o número do destinatário está no formato E.164 (Ex: `+5511999998888`). O backend espera este formato.
    *   O painel do chat deve validar o número antes do envio, mas erros podem ocorrer.
*   **Problemas na instância UAZAPI:**
    *   A instância do WhatsApp conectada ao UAZAPI pode estar desconectada ou ter perdido o QR Code.
    *   Verifique o "Connection Status" no cabeçalho do WhatsAppWeb. Se estiver "Instável" ou "Offline", pode ser a UAZAPI.
    *   Tente reiniciar a instância se houver uma opção de configuração (se implementada no backend).
*   **Falha de Autenticação/Autorização:**
    *   Seu token JWT do Supabase pode ter expirado ou ser inválido, impedindo o backend de processar a requisição.
    *   Tente fazer logout e login novamente.
*   **Erros no Backend:**
    *   O serviço de backend pode ter falhado ao processar o envio.
    *   Verifique o "API Debug Panel" para logs de requisição/resposta do endpoint `POST /api/wa/send-text`.
*   **Rate Limiting:**
    *   O UAZAPI ou o backend podem ter imposto limites de taxa de envio de mensagens. Se você estiver enviando muitas mensagens rapidamente, pode ser bloqueado temporariamente.
    *   Aguarde um tempo e tente novamente.

## 3. Falhas no Recebimento de Mensagens / Real-time Sync

**Sintomas:**
*   Novas mensagens do WhatsApp não aparecem na Inbox.
*   Status de entrega/leitura de mensagens não é atualizado.
*   Conversas não são atualizadas ou ordenadas corretamente.

**Possíveis Causas e Soluções:**
*   **Conexão Realtime Supabase:**
    *   O frontend depende de uma conexão em tempo real com o Supabase para receber atualizações do banco de dados (que são o resultado dos webhooks do UAZAPI).
    *   Verifique o "API Debug Panel" na aba "Status & Webhooks" para ver o status da "Conexão Realtime". Deve estar "Conectado".
    *   Se estiver "Desconectado", pode ser um problema de rede ou um problema com o serviço Realtime do Supabase.
*   **Webhooks do UAZAPI (Backend):**
    *   O UAZAPI envia eventos para um endpoint de webhook no nosso backend. Se este endpoint não estiver configurado corretamente ou se o backend não estiver funcionando, as mensagens não serão inseridas no Supabase.
    *   Verifique os logs do backend/Supabase Edge Functions (`zapi-webhook`, `sync-zapi-messages`) para qualquer erro.
*   **Regras de Segurança (RLS) do Supabase:**
    *   As políticas de Row Level Security no Supabase podem estar bloqueando o acesso do usuário a determinadas mensagens ou conversas.
    *   Verifique as políticas RLS para as tabelas `messages` e `conversations` (no console do Supabase).
*   **Cache Inconsistente:**
    *   O cache local do navegador pode estar desatualizado.
    *   Tente forçar uma sincronização manual (se disponível) ou limpe o cache do navegador.
*   **Deduplicação de Mensagens:**
    *   O sistema possui lógica de deduplicação. Se uma mensagem for erroneamente processada como duplicata, ela pode não aparecer.
    *   Verifique os logs do `WebhookReceiverService` no "API Debug Panel" para ver se mensagens estão sendo puladas por deduplicação.

## 4. Problemas com o Token JWT / Autenticação

**Sintomas:**
*   Erro "Não autenticado" ou "401 Unauthorized" ao tentar realizar ações.
*   Logout inesperado.
*   Não consegue fazer login ou registrar.

**Possíveis Causas e Soluções:**
*   **Token Expirado:**
    *   Os tokens JWT têm um tempo de vida. Você será automaticamente deslogado ao expirar.
    *   Simplesmente faça login novamente.
*   **Problemas de Rede:**
    *   A renovação do token ou a verificação da sessão podem falhar se a conexão de rede estiver instável.
*   **Sessão Inválida:**
    *   A sessão pode ter sido invalidada por motivos de segurança (ex: alteração de senha).
    *   Faça login novamente.
*   **Configuração do Supabase:**
    *   Verifique as chaves `SUPABASE_URL` e `SUPABASE_ANON_KEY` no seu ambiente.
*   **"Failed to fetch profile" na inicialização:**
    *   Isso pode ocorrer se houver um erro temporário na comunicação com o Supabase durante o carregamento do perfil do usuário.
    *   O sistema possui lógica de retry, mas se persistir, verifique a conectividade de rede e os logs do navegador.

## 5. Problemas de Offline Mode (Fila de Mensagens)

**Sintomas:**
*   Mensagens enviadas offline não são enviadas quando a conexão é restaurada.
*   O indicador de status de sincronização não mostra que a fila está sendo processada.

**Possíveis Causas e Soluções:**
*   **`healthCheckService` não restaurando o status:**
    *   Verifique se o `healthCheckService` está detectando corretamente o retorno da conectividade (listener `online` do navegador e polling).
*   **Falha no `processOfflineQueue`:**
    *   A função `processOfflineQueue` (no `useMessageCache` ou `healthCheckService`) pode estar falhando ao reenviar as mensagens.
    *   Verifique os logs do console para erros relacionados a "Processing offline messages" ou "Failed to sync message".
*   **Erro na API ao reenviar:**
    *   Mesmo se o cliente estiver online, o backend ou UAZAPI podem estar rejeitando as mensagens enfileiradas.
    *   Verifique o "API Debug Panel" para as requisições que deveriam ter sido reenviadas.

## 6. Problemas com a Conexão UAZAPI (Backend)

**Sintomas:**
*   Indicador de status da conexão (Health Check) mostra Amarelo (Instável) e a descrição menciona "WhatsApp Instance Disconnected".
*   Mensagens não são enviadas nem recebidas via WhatsApp.
*   QR Code não carrega ou mostra erro.

**Possíveis Causas e Soluções:**
*   **Instância Desconectada:**
    *   O WhatsApp web na instância do UAZAPI perdeu a conexão. Isso geralmente requer a leitura de um novo QR Code.
    *   Entre em contato com o administrador do sistema para verificar o status da instância UAZAPI e solicitar um novo QR Code, se necessário.
*   **Credenciais UAZAPI Inválidas:**
    *   As chaves de API (`Z_API_KEY`, `Z_API_SECURITY_TOKEN`) ou o webhook configurado no UAZAPI podem estar incorretos.
    *   Isso é uma configuração de backend/infraestrutura e requer acesso aos segredos do Supabase ou à configuração do UAZAPI.
*   **Reinício da Instância:**
    *   Se o UAZAPI travou, um reinício da instância pode resolver. Esta funcionalidade é controlada pelo backend e pode ser exposta através de um endpoint (`/api/wa/restart`).

## 7. Lentidão / Performance

**Sintomas:**
*   UI lenta, travando.
*   Mensagens demoram a carregar ou enviar.
*   Atraso na atualização do status das mensagens.

**Possíveis Causas e Soluções:**
*   **Problemas de Rede:**
    *   Alta latência de rede entre o cliente e o backend/Supabase.
    *   Verifique sua conexão e os tempos de resposta no "API Debug Panel".
*   **Backend/Banco de Dados Sobrecarrregados:**
    *   O backend ou o banco de dados Supabase podem estar lentos devido à alta carga.
    *   Verifique o monitoramento de recursos do servidor/Supabase.
*   **Otimização de Query:**
    *   Queries de banco de dados podem não estar otimizadas (faltando índices, etc.).
    *   Verifique os logs do Supabase para queries lentas.
*   **Cache Frontend:**
    *   Se o cache local (`useMessageCache`) não estiver funcionando ou estiver corrompido, o sistema pode estar sempre buscando dados do zero.
    *   Limpe o cache do navegador.
*   **Quantidade de Dados:**
    *   Um grande volume de mensagens ou conversas pode impactar a performance. O sistema deve implementar paginação e lazy loading para mitigar isso.

## 8. Erros de CORS

**Sintomas:**
*   Mensagens de erro no console do navegador como "Cross-Origin Request Blocked" ou "Access-Control-Allow-Origin".

**Possíveis Causas e Soluções:**
*   **Configuração do Backend:**
    *   O backend (`api.audicarefono.com.br`) não está configurado para permitir requisições do domínio do frontend.
    *   Isso é uma configuração do servidor backend e precisa ser ajustada para incluir o domínio do frontend na lista de origens permitidas (cabeçalhos `Access-Control-Allow-Origin`).
    *   Verifique o código da Supabase Edge Function `cors.ts` (se aplicável).

## 9. Questões de Conflito de Mensagens / Sincronização de Banco de Dados

**Sintomas:**
*   Ordem de mensagens inconsistente.
*   Mensagens duplicadas ou faltando.
*   Status de mensagens incorreto.

**Possíveis Causas e Soluções:**
*   **Relógio do Servidor/Cliente Desincronizado:**
    *   Diferenças significativas entre a hora do cliente e do servidor podem causar problemas na ordenação de mensagens baseada em `timestamp`.
*   **Falhas no Realtime ou Webhook:**
    *   Se o Supabase Realtime ou os webhooks falharem intermitentemente, as atualizações podem não chegar ao cliente ou chegar fora de ordem.
    *   A lógica de deduplicação e reordenação no frontend (`processMessages` em `useWhatsApp` e `WebhookReceiverService`) deve mitigar isso, mas pode ser sobrecarregada em caso de falha grave.
*   **Múltiplas Fontes de Update:**
    *   Se houver múltiplas fontes atualizando a mesma mensagem (ex: API de envio e webhook de status) sem um controle de versão adequado, podem ocorrer conflitos.
    *   A lógica de `message_update` no `WebhookReceiverService` deve sobrescrever com os dados mais recentes.

## 10. Problemas com Rate Limiting / Timeout

**Sintomas:**
*   Erros "429 Too Many Requests".
*   Requisições que demoram muito para responder e falham com "Timeout".

**Possíveis Causas e Soluções:**
*   **Rate Limiting da API Externa (WhatsApp/UAZAPI):**
    *   Você atingiu o limite de requisições da API. O backend deve implementar retries com exponential backoff, mas o cliente ainda pode ver os erros.
    *   Reduza a frequência das operações ou entre em contato com o provedor da API.
*   **Timeouts de Rede:**
    *   Requisições de rede demoram mais do que o esperado para serem concluídas.
    *   Isso pode ser devido à sobrecarga do servidor, lentidão da rede do cliente/servidor, ou gargalos na infraestrutura.
    *   Verifique o tempo das requisições no "API Debug Panel".

## 11. Decisão de Resolução de Problemas (Troubleshooting Decision Tree)

Este é um guia de alto nível para direcionar a investigação:

1.  **Problema Geral de Conectividade?**
    *   `SIM` -> Verifique: Internet local, Saúde do Backend (`health_check` no Painel de Testes), Logs do "API Debug Panel".
    *   `NÃO` -> Vá para o próximo passo.
2.  **Problemas no Envio de Mensagens?**
    *   `SIM` -> Verifique: Status da UAZAPI (Health Check), Formato do número (`E.164`), Logs do Backend (`send-text`), Rate Limiting.
    *   `NÃO` -> Vá para o próximo passo.
3.  **Problemas no Recebimento/Real-time?**
    *   `SIM` -> Verifique: Conexão Realtime Supabase (`API Debug Panel -> Status & Webhooks`), Configuração do Webhook UAZAPI, Políticas RLS do Supabase, Logs do Backend (`zapi-webhook`).
    *   `NÃO` -> Vá para o próximo passo.
4.  **Problemas de Autenticação (JWT)?**
    *   `SIM` -> Verifique: Login/Logout (renovar token), Configuração das chaves Supabase.
    *   `NÃO` -> Vá para o próximo passo.
5.  **Offline Mode não funciona?**
    *   `SIM` -> Verifique: `healthCheckService` detectando online/offline, Fila de mensagens (`useMessageCache`), Logs do console para `processOfflineQueue`.
    *   `NÃO` -> Vá para o próximo passo.
6.  **Problemas de Performance/Lentidão?**
    *   `SIM` -> Verifique: Latência de rede, Carga do Backend/Supabase, Otimização de Queries, Cache do Frontend.
    *   `NÃO` -> Vá para o próximo passo.

**Se o problema persistir após seguir os passos acima, colete todos os logs e informações disponíveis e entre em contato com o suporte técnico.**

## 12. Códigos de Erro Comuns e Soluções

*   **`401 Unauthorized` (JWT Inválido/Expirado):**
    *   **Causa:** O token de autenticação JWT fornecido na requisição é inválido, expirou ou está ausente.
    *   **Solução:** Faça logout e login novamente para obter um novo token.
*   **`403 Forbidden` (RLS ou Permissões):**
    *   **Causa:** O usuário autenticado não tem permissão para acessar o recurso solicitado (ex: políticas de RLS do Supabase impedindo acesso a dados de outra clínica).
    *   **Solução:** Verifique as políticas de RLS e as permissões do usuário/função no Supabase.
*   **`400 Bad Request` (Requisição Malformada):**
    *   **Causa:** A requisição HTTP enviada está incorreta, faltando parâmetros obrigatórios ou com formato inválido (ex: número de telefone sem prefixo E.164).
    *   **Solução:** Verifique o corpo da requisição e os parâmetros. Consulte a documentação da API.
*   **`404 Not Found` (Endpoint/Recurso Inexistente):**
    *   **Causa:** O endpoint da API solicitado não existe ou o recurso (ex: mensagem, contato) não foi encontrado.
    *   **Solução:** Verifique a URL da requisição. Se o recurso deveria existir, investigue o banco de dados.
*   **`429 Too Many Requests` (Rate Limiting):**
    *   **Causa:** O limite de requisições por período de tempo foi excedido.
    *   **Solução:** Reduza a frequência das requisições. O sistema deve implementar backoff exponencial. Aguarde e tente novamente.
*   **`500 Internal Server Error` (Erro no Servidor):**
    *   **Causa:** Um erro inesperado ocorreu no backend. Pode ser um bug, uma falha na comunicação com o UAZAPI ou um problema de banco de dados.
    *   **Solução:** Verifique os logs do backend (Edge Functions no Supabase) para identificar a causa raiz. Entre em contato com o suporte.
*   **`Failed to fetch` (Erro de Rede/CORS/Timeout):**
    *   **Causa:** Erro genérico de rede. Pode ser problema de conectividade, bloqueio de CORS, timeout de requisição, ou o servidor estar inacessível.
    *   **Solução:** Verifique a conexão com a internet, logs de CORS no navegador, status do backend.

---
**Lembre-se:** A maioria dos problemas de conectividade e sincronização pode ser diagnosticada com o "API Debug Panel" e monitorando os logs do console do navegador. Em caso de problemas persistentes, colete as informações dos logs e entre em contato com o suporte técnico.