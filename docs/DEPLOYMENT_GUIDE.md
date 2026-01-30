# Guia de Implantação e Go-Live (Deployment & Go-Live Guide)

Este documento fornece um roteiro detalhado para a implantação em produção do sistema AudiCare. Siga rigorosamente cada etapa para garantir um lançamento seguro, estável e performático.

## 1. Checklist Pré-Implantação (Pre-Deployment)

Antes de iniciar o processo de deploy, verifique:
- [ ] O código fonte está versionado e a branch `main` está estável.
- [ ] Todos os testes automatizados (`src/utils/validationScript.js`) passaram no ambiente de staging.
- [ ] As variáveis de ambiente de produção foram definidas.
- [ ] O acesso ao projeto Supabase de produção está garantido.
- [ ] A instância do UAZAPI está contratada e ativa.

## 2. Configuração de Variáveis de Ambiente

Configure as seguintes variáveis no ambiente de hospedagem do Frontend (Vercel/Netlify) e nos Secrets do Supabase.

### Frontend (.env.production)
| Variável | Descrição |
| :--- | :--- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase. |

### Backend (Supabase Secrets)
Use o painel do Supabase ou CLI para definir:
| Secret | Descrição |
| :--- | :--- |
| `Z_API_KEY` | Chave da instância UAZAPI. |
| `Z_API_SECURITY_TOKEN` | Token de segurança para validar webhooks do UAZAPI. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave administrativa para Edge Functions (uso interno). |

## 3. Validação da Configuração de Backend

As Edge Functions são o coração da integração.
1.  **Deploy:** Execute `supabase functions deploy send-zapi-message zapi-webhook zapi-health-check`.
2.  **Verificação:** No painel do Supabase > Edge Functions, verifique se o status é "Healthy".
3.  **Teste de Conectividade:** Use o `IntegrationTestPanel` no frontend para rodar o teste `backend_ping` e confirmar que o frontend consegue chamar as funções.

## 4. Configuração da Instância UAZAPI

1.  **Acesso:** Logue no painel do UAZAPI.
2.  **Vínculo:** Escaneie o QR Code com o aparelho WhatsApp da clínica.
3.  **Webhook:** Configure a URL de retorno para: `https://<project-ref>.supabase.co/functions/v1/zapi-webhook`.
4.  **Segurança:** Defina o `Client Token` no UAZAPI igual ao valor de `Z_API_SECURITY_TOKEN` nos secrets do Supabase.
5.  **Validação:** Rode o teste `uazapi_instance` no painel de validação.

## 5. Autenticação e JWT

1.  **Supabase Auth:** Certifique-se de que o provedor de Email/Senha está ativo.
2.  **Site URL:** Configure a URL do site em produção em Authentication > URL Configuration.
3.  **Redirect URLs:** Adicione as URLs de redirecionamento (ex: `https://app.audicare.com.br/**`).
4.  **Validação:** Tente fazer login na produção e verifique se o token JWT é gerado corretamente (teste `auth_jwt`).

## 6. Migração de Banco de Dados

1.  **Schema:** Aplique todas as migrações pendentes na pasta `supabase/migrations`.
2.  **RLS:** Verifique se as políticas de Row Level Security (RLS) estão ativas para todas as tabelas sensíveis (`messages`, `contacts`, `patients`). Execute o script de verificação de segurança se disponível.
3.  **Seed Data:** (Opcional) Se for uma instalação limpa, popule tabelas auxiliares (ex: `message_templates` padrão) usando scripts SQL.

## 7. Hardening de Segurança (Security Checklist)

- [ ] **RLS:** Confirme que nenhuma tabela sensível tem políticas "public" abertas para escrita.
- [ ] **API Gateway:** Verifique se o CORS nas Edge Functions está restrito ao domínio de produção.
- [ ] **Logs:** Certifique-se de que informações sensíveis (PII, tokens) não estão sendo logadas no console ou banco.
- [ ] **Backups:** Ative o Point-in-Time Recovery (PITR) no Supabase se o plano permitir.

## 8. Otimização de Performance

- [ ] **Índices:** Verifique se as tabelas `messages` (conversation_id, momment) e `contacts` (phone) possuem índices adequados.
- [ ] **Assets:** O build do Vite (`npm run build`) deve minificar JS e CSS.
- [ ] **Cache:** Confirme se o `Cache-Control` está configurado corretamente para arquivos estáticos no CDN.

## 9. Configuração de Monitoramento

1.  **Supabase Dashboard:** Monitore o uso de CPU, RAM e Disk IO do banco.
2.  **Frontend Monitoring:** O `MonitoringDashboard` (`src/components/Debug/MonitoringDashboard.jsx`) já está integrado. Instrua a equipe técnica a verificá-lo periodicamente.
3.  **Alertas:** Configure alertas de email no Supabase para falhas em Edge Functions.

## 10. Configuração de Logging

- **Frontend:** Erros críticos são capturados pelo `ErrorBoundary`. Considere integrar Sentry ou LogRocket para logs remotos em produção.
- **Backend:** Logs de execução das Edge Functions são retidos pelo Supabase. Acesse via Dashboard > Edge Functions > Logs.

## 11. Procedimentos de Backup e Recuperação

- **Automático:** O Supabase realiza backups diários.
- **Manual:** Antes de grandes atualizações, execute um dump manual: `pg_dump <db_url> > backup_date.sql`.
- **Recuperação:** Em caso de desastre, use o painel do Supabase para restaurar a partir do PITR ou importe o dump SQL.

## 12. Procedimentos de Rollback

Se o deploy falhar:
1.  **Frontend:** Reverta para o commit anterior no Git e redeploy na plataforma de hospedagem (Vercel/Netlify geralmente têm botão de "Rollback").
2.  **Backend (Functions):** Redeploy da versão anterior das funções via CLI.
3.  **Banco de Dados:** Se houve migração destrutiva, restaure o backup feito imediatamente antes do deploy.

## 13. Validação Pós-Implantação

Execute a "Lista de Verificação de Validação" (`src/docs/VALIDATION_CHECKLIST.md`) completa no ambiente de produção:
1.  Login com usuário real.
2.  Envio e recebimento de mensagem de teste.
3.  Verificação de sincronização de contatos.
4.  Teste de modo offline.

## 14. Monitoramento em Produção

Estabeleça uma rotina:
- **Diário:** Checar `MonitoringDashboard` para erros de webhook e latência.
- **Semanal:** Revisar logs de erro do Supabase e estatísticas de uso.

## 15. Resposta a Incidentes

1.  **Nível 1 (Lentidão/Erros UI):** Verificar logs do console do navegador e `APIDebugPanel`. Limpar cache local.
2.  **Nível 2 (Falha de Mensagens):** Verificar status do UAZAPI e conexão da instância. Reiniciar instância via endpoint `/wa/restart` se necessário.
3.  **Nível 3 (Sistema Fora do Ar):** Verificar status do Supabase e provedor de hospedagem. Acionar suporte sênior.

## 16. Baseline de Performance

Valores de referência esperados:
- **Carregamento Inicial:** < 1.5s
- **Envio de Mensagem:** < 500ms (UI update), < 2s (Delivery confirm)
- **Latência API:** < 300ms
- **Sync Inicial:** < 5s para 100 contatos

## 17. Planejamento de Capacidade

- **Banco de Dados:** O plano Pro do Supabase suporta até 8GB de disco e ~500 conexões. Monitore se chegar a 80%.
- **UAZAPI:** Verifique os limites de envio de mensagens por segundo do plano contratado para evitar bloqueios do WhatsApp.

## 18. Procedimentos de Escala

- **Vertical:** Aumentar recursos do projeto Supabase (Compute Add-ons) se a CPU do banco ficar constantemente > 80%.
- **Horizontal:** O frontend (estático) escala automaticamente na CDN. As Edge Functions escalam automaticamente por requisição.

## 19. Checklist de Go-Live (Dia D)

- [ ] Backup final realizado.
- [ ] Variáveis de ambiente confirmadas.
- [ ] Deploy frontend realizado com sucesso.
- [ ] Deploy backend (functions) realizado com sucesso.
- [ ] Instância UAZAPI conectada e saudável.
- [ ] Teste E2E executado em produção.
- [ ] DNS propagado e SSL ativo.
- [ ] Equipe de suporte notificada.

## 20. Suporte Pós-Lançamento

- **Canal de Suporte:** Definir email/chat para reporte de bugs.
- **Feedback:** Coletar feedback dos primeiros usuários sobre a velocidade e estabilidade do chat.
- **Updates:** Planejar janelas de manutenção para correções não críticas.