# Guia de Setup do Projeto Supabase

Este documento fornece um passo a passo para configurar um novo projeto Supabase do zero, aplicando o esquema de banco de dados e as configurações necessárias para a aplicação AudiCare.

## 1. Criar um Novo Projeto no Supabase

1.  Acesse [supabase.com](https://supabase.com/) e faça login.
2.  Clique em **"New project"**.
3.  Escolha uma organização, dê um nome ao seu projeto (ex: `audicare-system`), gere uma senha segura para o banco de dados e escolha a região mais próxima de seus usuários.
4.  Aguarde a criação do projeto.

## 2. Executar as Migrações SQL

As migrações devem ser executadas na ordem correta para garantir que as tabelas, políticas e funções sejam criadas com as dependências corretas.

1.  **Acesse o SQL Editor:**
    *   No painel do seu projeto, navegue até a seção **SQL Editor** no menu lateral esquerdo.
2.  **Execute os Scripts de Migração:**
    *   Para cada arquivo na pasta `migrations/`, copie todo o conteúdo e cole em uma nova query no SQL Editor. Execute os scripts na seguinte ordem:
        1.  `001_create_multichannel_tables.sql`
        2.  `002_create_rls_policies.sql`
        3.  `003_create_indexes.sql`
        4.  `004_create_triggers.sql`
    *   Após cada execução, verifique se a mensagem "Success. No rows returned" é exibida.

## 3. Configurar Variáveis de Ambiente

A aplicação frontend precisa das credenciais do Supabase para se conectar.

1.  **Encontre suas Credenciais:**
    *   No painel do Supabase, vá para **Project Settings** (ícone de engrenagem) > **API**.
    *   Você encontrará a **Project URL** e a **Project API Key** (a chave `anon`).
2.  **Crie o Arquivo `.env.local`:**
    *   Na raiz do seu projeto frontend, crie um arquivo chamado `.env.local`.
    *   Adicione as seguintes variáveis, substituindo pelos valores do seu projeto: