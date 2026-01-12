# Checklist de Pré-Produção - Módulo de Atendimento Multicanal

**Projeto:** AudiCare - Módulo de Atendimento Multicanal
**Data:** 17 de Novembro de 2025
**Versão da Aplicação:** 1.1.0

Este checklist detalha as tarefas críticas que devem ser concluídas e verificadas antes que o Módulo de Atendimento Multicanal seja lançado em ambiente de produção. O objetivo é garantir a estabilidade, segurança, performance e capacidade de manutenção da aplicação.

---

## 1. Banco de Dados (Supabase)

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| **1.1. Migrações** | | | | |
| [ ] Todas as migrações SQL (`001` a `004`) executadas com sucesso no ambiente de produção. | `[ ]` | DBA/DevOps | | Confirmar logs de execução sem erros. |
| [ ] Verificação da estrutura das tabelas criadas (`channels`, `contacts`, `conversations`, `messages`, etc.). | `[ ]` | DBA/QA | | Usar `Table Editor` no Supabase e `VALIDATION_CHECKLIST.md`. |
| [ ] Dados de teste removidos do ambiente de produção (se aplicável). | `[ ]` | DBA/Dev | | Ambientes de staging/dev podem manter, produção deve estar limpo. |
| **1.2. Segurança (RLS)** | | | | |
| [ ] Políticas de RLS ativas e testadas para todas as tabelas sensíveis (`conversations`, `messages`, `contacts`, `profiles`, `clinics`, etc.). | `[ ]` | Dev/QA | | RLS deve impedir acesso não autorizado a dados de outras clínicas. |
| [ ] Funções e Triggers (ex: `is_member_of_clinic`, `handle_updated_at`) verificadas e funcionando. | `[ ]` | Dev/DBA | | Testar via SQL Editor e verificação de logs. |
| **1.3. Índices** | | | | |
| [ ] Índices criados e otimizados para as colunas mais consultadas. | `[ ]` | DBA/Dev | | Verificar performance de queries com `EXPLAIN ANALYZE`. |
| **1.4. Backups** | | | | |
| [ ] Estratégia de backup automático do Supabase configurada e verificada. | `[ ]` | DevOps | | Confirmação de que backups são feitos regularmente e armazenados com segurança. |

---

## 2. Segurança

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| **2.1. Autenticação e Autorização** | | | | |
| [ ] Testes completos de login, logout e registro de usuário. | `[ ]` | QA | | Testar diferentes papéis (admin, atendente) e suas permissões. |
| [ ] Verificação de que apenas usuários autenticados podem acessar rotas protegidas. | `[ ]` | QA | | |
| **2.2. Proteção de Dados** | | | | |
| [ ] Credenciais sensíveis (chaves de API, tokens) armazenadas como Supabase Secrets. | `[ ]` | Dev/DevOps | | Nunca hardcode ou exponha publicamente. |
| [ ] Certificado SSL/TLS configurado para todos os endpoints (frontend, Supabase, Edge Functions). | `[ ]` | DevOps | | Default no Supabase e em muitos provedores de hospedagem. |
| **2.3. CORS** | | | | |
| [ ] Configurações de CORS corretas para Edge Functions e APIs externas. | `[ ]` | Dev/DevOps | | Garantir que o frontend possa se comunicar com o backend sem erros. |
| **2.4. Análise de Dependências** | | | | |
| [ ] Varredura de segurança nas dependências do projeto para vulnerabilidades conhecidas. | `[ ]` | Dev | | Usar `npm audit` ou ferramentas de SAST/DAST. |

---

## 3. Performance

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| **3.1. Otimizações Frontend** | | | | |
| [ ] Lazy loading/code splitting implementado para módulos pesados. | `[ ]` | Dev | | Verificado em `App.jsx`. |
| [ ] Componentes memoizados (`React.memo`, `useCallback`, `useMemo`) para evitar re-renderizações desnecessárias. | `[ ]` | Dev | | Principalmente em listas e componentes complexos. |
| [ ] Imagens e assets otimizados (compressão, formatos modernos). | `[ ]` | Dev | | Utilizar CDN para assets. |
| **3.2. Otimizações Backend/Database** | | | | |
| [ ] Paginação/Infinite Scroll implementado para listas longas (`conversations`, `messages`). | `[ ]` | Dev | | **PRIORIDADE**: Abordado em `KNOWN_ISSUES.md`. |
| [ ] Queries complexas otimizadas (RPCS, views materializadas, etc.). | `[ ]` | Dev/DBA | | Baseado em `PERFORMANCE_NOTES.md`. |
| [ ] Realtime subscriptions gerenciadas corretamente (limpeza no unmount). | `[ ]` | Dev | | |
| **3.3. Testes de Carga** | | | | |
| [ ] Testes de carga (load tests) realizados para simular múltiplos usuários e garantir a estabilidade sob estresse. | `[ ]` | DevOps | | |

---

## 4. Testes

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| **4.1. Testes Unitários** | | | | |
| [ ] Cobertura mínima de testes unitários para funções e hooks críticos. | `[ ]` | Dev | | Utilizar Jest/React Testing Library. |
| **4.2. Testes de Integração** | | | | |
| [ ] Testes de integração entre componentes e APIs do `messaging.js`. | `[ ]` | Dev | | |
| **4.3. Testes End-to-End (E2E)** | | | | |
| [ ] Todos os cenários E2E (definidos em `E2E_TESTING_GUIDE.md`) executados com sucesso. | `[ ]` | QA | | Utilizar `MANUAL_TEST_CASES.md`. |
| [ ] Testes de Realtime (sincronização multi-aba, atualização de status). | `[ ]` | QA | | Testado através de manipulação direta do BD via SQL Editor. |
| [ ] Testes de responsividade em diferentes dispositivos e navegadores. | `[ ]` | QA | | |
| **4.4. Testes de Regressão** | | | | |
| [ ] Testes de regressão executados para garantir que novas funcionalidades não quebraram as existentes. | `[ ]` | QA | | |

---

## 5. Documentação

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| **5.1. Documentação Técnica** | | | | |
| [ ] `README_MULTICHANNEL.md` atualizado e completo. | `[ ]` | Dev | | |
| [ ] `GETTING_STARTED.md` atualizado e claro para novos desenvolvedores. | `[ ]` | Dev | | |
| [ ] `API_DOCUMENTATION.md` detalhada e atualizada. | `[ ]` | Dev | | |
| [ ] `CURRENT_DATABASE_STRUCTURE.md` reflete o estado atual do BD. | `[ ]` | Dev/DBA | | |
| [ ] `KNOWN_ISSUES.md` lista problemas conhecidos e limitações. | `[ ]` | Dev | | |
| [ ] `PERFORMANCE_NOTES.md` detalha otimizações e gargalos. | `[ ]` | Dev | | |
| **5.2. Guias e Manuais** | | | | |
| [ ] `MIGRATION_INSTRUCTIONS.md` e `SUPABASE_SETUP.md` claros e utilizáveis. | `[ ]` | Dev/DevOps | | |
| [ ] `E2E_TESTING_GUIDE.md` e `MANUAL_TEST_CASES.md` completos. | `[ ]` | QA | | |
| [ ] `TROUBLESHOOTING_GUIDE.md` abrangente para problemas comuns. | `[ ]` | Dev/Suporte | | |

---

## 6. Monitoramento e Observabilidade

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| [ ] Logs de aplicação (frontend e backend) configurados e acessíveis. | `[ ]` | DevOps | | Integrar com ferramenta de monitoramento de logs (ex: Logtail, Datadog). |
| [ ] Alertas configurados para erros críticos e falhas de performance. | `[ ]` | DevOps | | Monitorar Edge Functions, uso de BD, etc. |
| [ ] Métricas de performance (CPU, memória, latência) coletadas. | `[ ]` | DevOps | | |
| [ ] Ferramenta de rastreamento de erros (ex: Sentry) integrada. | `[ ]` | Dev | | |
| [ ] Painel de Health Check (`/health-check`) funcionando corretamente. | `[ ]` | Dev/QA | | |

---

## 7. Deployment

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| [ ] Variáveis de ambiente configuradas no ambiente de produção/staging. | `[ ]` | DevOps | | Verificar que não há informações sensíveis hardcoded. |
| [ ] Pipeline de CI/CD configurado para build e deploy automatizado. | `[ ]` | DevOps | | |
| [ ] Estratégia de rollback definida e testada. | `[ ]` | DevOps | | Como reverter para a versão anterior em caso de falha crítica. |
| [ ] Configuração de domínio personalizado (se aplicável). | `[ ]` | DevOps | | |

---

## 8. Suporte e Lançamento

| Item | Status | Responsável | Data Conclusão | Notas/Observações |
| :--- | :---: | :--- | :--- | :--- |
| [ ] Documentação de usuário final/FAQ atualizada. | `[ ]` | Suporte | | Para ajudar os atendentes a usar o novo módulo. |
| [ ] Canal de comunicação para feedback e relatórios de bugs. | `[ ]` | Suporte | | |
| [ ] Treinamento para equipe de suporte e usuários finais. | `[ ]` | Suporte | | |

---

## 9. Riscos e Mitigações Identificados

| Risco | Mitigação | Status | Responsável |
| :--- | :--- | :---: | :--- |
| **Performance:** Paginação ausente em listas longas. | **Mitigação:** Implementar paginação/"infinite scroll" o mais breve possível (Fase 3). | `[ ]` | Dev |
| **Confiabilidade:** Falhas na conexão Realtime sem feedback ao usuário. | **Mitigação:** Implementar indicador de status de conexão Realtime na UI e lógica de reconexão robusta. | `[ ]` | Dev |
| **Segurança:** Acessos não autorizados devido a RLS falha. | **Mitigação:** Revisão e testes rigorosos das políticas de RLS e funções de segurança. | `[ ]` | Dev/QA |
| **Manutenção:** Documentação desatualizada no futuro. | **Mitigação:** Estabelecer processo de revisão e atualização da documentação contínuo. | `[ ]` | Todos |

---

## Assinatura de Aprovação

A aprovação para o lançamento em produção requer a revisão e o aceite dos seguintes stakeholders.

| Nome | Cargo | Assinatura | Data |
| :--- | :--- | :--- | :--- |
| | Gerente de Projeto | | |
| | Líder Técnico | | |
| | Chefe de QA | | |
| | Chefe de Operações | | |

---