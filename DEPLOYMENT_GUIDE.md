# Guia de Deploy do Projeto AudiCare

Este documento descreve o processo de deploy da aplicação AudiCare, focando no ambiente de produção.

## 1. Pré-requisitos

*   **Repositório Git:** O código-fonte deve estar versionado em um repositório Git (ex: GitHub, GitLab, Bitbucket).
*   **Conta Supabase:** Um projeto Supabase configurado com o banco de dados, autenticação, Edge Functions e Realtime.
*   **Provedor de Hospedagem Frontend:** Uma plataforma para hospedar a aplicação React (ex: Vercel, Netlify, Cloudflare Pages, Hostinger).
*   **Variáveis de Ambiente:** Todas as variáveis de ambiente necessárias para a aplicação.
*   **Node.js e npm/yarn:** Instalados localmente para build.

## 2. Configuração do Projeto Supabase

Certifique-se de que seu projeto Supabase está configurado corretamente:

1.  **Banco de Dados:**
    *   Todas as tabelas (`clinics`, `profiles`, `conversations`, `messages`, `contacts`, `channel_credentials`, etc.) devem estar criadas.
    *   Todas as RLS policies devem estar habilitadas e configuradas corretamente.
    *   Todos os triggers e funções (`handle_incoming_message`, `update_conversation_on_new_message`, `is_member_of_clinic`, etc.) devem estar deployados.
2.  **Edge Functions:**
    *   As Edge Functions (`n8n-webhook`, `send-whatsapp-message`, etc.) devem estar deployadas no Supabase.
    *   Verifique se as variáveis de ambiente necessárias para as Edge Functions (ex: `SUPABASE_SERVICE_ROLE_KEY`) estão configuradas nos segredos do projeto Supabase.
3.  **Realtime:**
    *   O Realtime deve estar habilitado para as tabelas `conversations` e `messages` (e outras que necessitem de atualizações em tempo real).
4.  **Autenticação:**
    *   Provedores de autenticação (email/senha, OAuth) configurados conforme necessário.

## 3. Deploy do Frontend (Exemplo: Vercel/Netlify)

Este guia usa Vercel/Netlify como exemplo, mas o processo é similar para outras plataformas.

1.  **Conectar Repositório:**
    *   Faça login na sua conta Vercel/Netlify.
    *   Importe seu projeto Git.
2.  **Configurar Build Settings:**
    *   **Build Command:** `npm run build` ou `yarn build`
    *   **Output Directory:** `dist` (padrão para Vite)
3.  **Configurar Variáveis de Ambiente:**
    *   Adicione as seguintes variáveis de ambiente (e quaisquer outras que seu projeto utilize) no painel de configurações do seu deploy:
        *   `VITE_SUPABASE_URL`: A URL do seu projeto Supabase (encontrada em Project Settings -> API).
        *   `VITE_SUPABASE_ANON_KEY`: A chave `anon` do seu projeto Supabase (encontrada em Project Settings -> API).
    *   **Importante:** Certifique-se de que estas variáveis estão configuradas para o ambiente de produção.
4.  **Deploy:**
    *   Inicie o deploy. A plataforma irá clonar seu repositório, instalar dependências, executar o comando de build e servir os arquivos estáticos.
5.  **Configurar Domínio Personalizado (Opcional):**
    *   Se você tiver um domínio personalizado, configure-o na plataforma de hospedagem e atualize os registros DNS.

## 4. Configuração de Workflows Externos (Exemplo: n8n)

Se você estiver usando n8n ou outra ferramenta de automação para intermediar a comunicação com APIs de canais (WhatsApp, Instagram, Facebook), configure os workflows:

1.  **Webhooks de Entrada:** Configure os webhooks do n8n para receber eventos das APIs dos canais (ex: Meta Webhooks para WhatsApp/Instagram/Facebook).
2.  **Processamento de Dados:** Crie a lógica no n8n para transformar os payloads recebidos no formato esperado pela sua Edge Function `n8n-webhook` do Supabase.
3.  **Chamada à Edge Function:** Configure o n8n para fazer requisições `POST` para a URL da sua Edge Function `n8n-webhook` do Supabase.
4.  **Webhooks de Saída:** Configure o n8n para receber requisições das suas Edge Functions de envio de mensagens (ex: `send-whatsapp-message`) e encaminhá-las para as APIs dos canais.

## 5. Monitoramento Pós-Deploy

Após o deploy, é crucial monitorar a aplicação:

*   **Logs do Frontend:** Verifique os logs da sua plataforma de hospedagem para erros no frontend.
*   **Logs do Supabase:**
    *   **Logs de Banco de Dados:** Monitore queries lentas ou erros de SQL.
    *   **Logs de Edge Functions:** Verifique os logs das suas Edge Functions para erros de execução.
    *   **Logs de Autenticação:** Monitore tentativas de login e registro.
*   **Monitoramento de Performance:** Utilize as ferramentas de monitoramento do Supabase (Reports -> Database Health) e da sua plataforma de hospedagem.
*   **Testes de Sanidade:** Realize um conjunto rápido de testes manuais para garantir que as funcionalidades críticas estão operacionais.

## 6. Atualizações e Manutenção

*   **CI/CD:** Configure um pipeline de CI/CD para automatizar o processo de build e deploy a cada push para a branch principal.
*   **Rollbacks:** Esteja preparado para reverter para uma versão anterior em caso de problemas críticos.
*   **Backups:** Garanta que o Supabase está configurado para backups automáticos do seu banco de dados.
*   **Atualizações de Dependências:** Mantenha as dependências do projeto atualizadas para garantir segurança e performance.