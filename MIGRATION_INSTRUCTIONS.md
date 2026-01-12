# Guia Detalhado de Execução de Migrações SQL no Supabase

Este documento fornece um passo a passo detalhado para aplicar os scripts de migração SQL no seu projeto Supabase, garantindo a configuração correta do banco de dados para o módulo de Atendimento Multicanal.

## 1. Pré-requisitos

*   **Projeto Supabase:** Você já deve ter um projeto Supabase criado e acesso de administrador ao seu painel.
*   **Scripts de Migração:** Os arquivos `.sql` devem estar disponíveis (localizados em `migrations/`).

## 2. Ordem de Execução das Migrações

Os scripts de migração são sequenciais e devem ser executados na ordem especificada:

1.  `001_create_multichannel_tables.sql`
2.  `002_create_rls_policies.sql`
3.  `003_create_indexes.sql`
4.  `004_create_triggers.sql`

## 3. Passo a Passo: Executar cada Migração

Para cada arquivo `.sql` na ordem acima, siga os seguintes passos:

1.  **Acessar o SQL Editor do Supabase:**
    *   Faça login no seu painel do Supabase.
    *   No menu lateral esquerdo, clique em **"SQL Editor"**.
    <img alt="Screenshot do SQL Editor no Supabase" src="https://images.unsplash.com/photo-1617854818583-09e7f077a156" />

2.  **Criar uma Nova Query:**
    *   Dentro do SQL Editor, clique no botão **"+ New query"** (ou "Nova Query" se estiver em português).
    <img alt="Screenshot do botão Nova Query" src="https://images.unsplash.com/photo-1627398242454-45a1465c2479" />

3.  **Copiar e Colar o Conteúdo da Migração:**
    *   Abra o arquivo `.sql` correspondente (ex: `001_create_multichannel_tables.sql`) em um editor de texto.
    *   **Copie TODO o conteúdo** do arquivo.
    *   Cole o conteúdo na área de texto do SQL Editor do Supabase.

4.  **Executar a Query:**
    *   Clique no botão **"RUN"** (geralmente localizado no canto superior direito).
    <img alt="Screenshot do botão RUN no SQL Editor" src="https://images.unsplash.com/photo-1627398242454-45a1465c2479" />

5.  **Verificar o Resultado:**
    *   Uma mensagem de **"Success"** (Sucesso) ou **"No rows returned"** (Nenhuma linha retornada) no painel de resultados indica que a migração foi bem-sucedida.
    *   **Se ocorrerem erros:** Uma mensagem de erro detalhada será exibida. Você precisará investigar e corrigir o problema. Não continue para a próxima migração até que a atual seja bem-sucedida.

6.  **Repetir para o Próximo Script:**
    *   Prossiga para o próximo arquivo `.sql` na sequência e repita os passos de 2 a 5.

## 4. Inserir Dados de Teste

Após a execução bem-sucedida de todas as migrações, você pode inserir dados de teste para começar a usar a aplicação.

1.  **Acesse o arquivo `TESTING_QUERIES.md`:** Este arquivo contém scripts SQL para popular o banco de dados com exemplos de clínicas, canais, contatos, conversas e mensagens.
2.  **Obtenha o `clinic_id` e `user_id`:** Para usar as queries de teste, você precisará dos UUIDs da sua clínica (se já criada) e do seu próprio perfil de usuário. Você pode encontrá-los na tabela `public.clinics` e `public.profiles` no Supabase, ou no payload do seu token JWT.
3.  **Edite e Execute a Query de Teste:** Copie o script SQL do `TESTING_QUERIES.md`, substitua os placeholders `COLOQUE_O_ID_DA_SUA_CLINICA_AQUI` e `COLOQUE_O_ID_DO_SEU_USUARIO_AQUI` pelos seus UUIDs reais e execute-o no SQL Editor, assim como fez com as migrações.

## 5. Rollback (Reversão de Migrações)

Cada script de migração contém uma seção de `ROLLBACK SCRIPT` comentada no final. Para reverter uma migração:

1.  **Ordem Inversa:** Execute os rollbacks na ordem inversa da aplicação (ou seja, `004`, `003`, `002`, `001`).
2.  **Copie o Script de Rollback:** Abra o arquivo `.sql` que deseja reverter, copie **apenas** o conteúdo dentro do bloco `/* ... */` do `ROLLBACK SCRIPT`, removendo os caracteres de comentário `--`.
3.  **Execute no SQL Editor:** Cole e execute este script no SQL Editor.

## 6. Troubleshooting Comum

*   **"permission denied for table X"**: Geralmente indica um problema com as políticas de RLS. Certifique-se de que `002_create_rls_policies.sql` foi executado corretamente e que a função `is_member_of_clinic()` existe e está funcionando.
*   **"function is_member_of_clinic() does not exist"**: Verifique se a função `is_member_of_clinic()` foi criada. Ela é parte das migrações do projeto base ou deve ser criada manualmente.
*   **"Table X already exists"**: Se você tentar executar uma `CREATE TABLE` em uma tabela que já existe, isso acontecerá. Use os scripts de rollback para limpar o ambiente antes de reexecutar. Os scripts de migração incluem `DROP TABLE IF EXISTS` para tentar evitar isso, mas pode acontecer em certos cenários.
*   **"Column Y does not exist"**: Verifique se todas as migrações anteriores foram executadas na ordem correta.

## 7. Validar Integridade dos Dados e Estrutura

Após as migrações, você pode verificar a estrutura do banco de dados:

1.  **Table Editor:** No painel do Supabase, vá para **"Table Editor"**.
    *   Verifique se as tabelas `channels`, `contacts`, `conversations`, `messages`, etc., foram criadas.
    *   Clique em cada tabela para ver as colunas, tipos e se os dados de teste foram inseridos.
2.  **Authentication -> Policies:** Verifique se as políticas de RLS estão ativas para as novas tabelas.
3.  **Database -> Functions:** Confirme que a função `handle_updated_at()` existe.
4.  **Database -> Replication:** Para testar o Realtime, certifique-se de que as tabelas `conversations` e `messages` estão configuradas para o Realtime.

## 8. Testando o Realtime

1.  Abra a aplicação frontend e navegue para a página "Caixa de Entrada".
2.  Abra o SQL Editor do Supabase.
3.  Insira uma nova mensagem diretamente na tabela `public.messages` para uma conversa existente, via SQL.