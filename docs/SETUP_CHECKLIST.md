# Checklist de Configuração da Integração

Este guia fornece um passo a passo completo para configurar e validar a integração da Caixa de Entrada no sistema AudiCare, especialmente com serviços como n8n.

### Fase 1: Configuração do Supabase

1.  **[ ] Criar Projeto no Supabase:**
    *   Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
    *   Guarde as credenciais do projeto: **Project URL** e a chave **`anon`**. Elas serão usadas no frontend.

2.  **[ ] Executar o Script de Migração SQL:**
    *   Navegue até o **SQL Editor** no painel do seu projeto Supabase.
    *   Copie o conteúdo completo do script SQL de migração fornecido (que cria as tabelas `contacts`, `conversations`, `messages`, etc.).
    *   Cole o script no editor e clique em **"RUN"**.
    *   Verifique na seção `public` do **Table Editor** se todas as tabelas e funções (`handle_incoming_message`, `is_member_of_clinic`) foram criadas sem erros.

3.  **[ ] Configurar as Policies de RLS (Row Level Security):**
    *   O script de migração já inclui as políticas de RLS.
    *   Para validar, vá em **Authentication -> Policies**. Procure pelas tabelas (`contacts`, `conversations`, `messages`) e confirme que a RLS está habilitada e que a política "Users can access data from their own clinics" está ativa.

4.  **[ ] Configurar os Segredos do Projeto para Edge Functions:**
    *   Navegue até **Project Settings -> Database -> Secrets**.
    *   Adicione a chave `service_role` do seu projeto. Esta chave permite que as Edge Functions acessem o banco com permissões de administrador.
        *   **Name**: `SUPABASE_SERVICE_ROLE_KEY`
        *   **Value**: Copie o valor de **Project Settings -> API -> Project API keys -> `service_role`**.

### Fase 2: Configuração do Ambiente Frontend

1.  **[ ] Clonar o Repositório:**
    *   Clone o projeto do repositório para sua máquina local.

2.  **[ ] Instalar Dependências:**
    *   Na raiz do projeto, execute o comando: `npm install`.

3.  **[ ] Configurar Variáveis de Ambiente:**
    *   Crie um arquivo chamado `.env` na raiz do projeto.
    *   Adicione as credenciais do seu projeto Supabase: