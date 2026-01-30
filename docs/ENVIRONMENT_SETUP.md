# Configuração do Ambiente do Projeto AudiCare

Este documento detalha as variáveis de ambiente necessárias para o projeto AudiCare e como configurá-las corretamente para que a aplicação frontend possa se comunicar com o backend do Supabase.

## 1. Variáveis de Ambiente Necessárias

As seguintes variáveis de ambiente são cruciais para a operação do frontend:

*   `VITE_SUPABASE_URL`: A URL do seu projeto Supabase. É usada para que o cliente Supabase saiba para qual endpoint da API ele deve fazer as requisições.
*   `VITE_SUPABASE_ANON_KEY`: A "Anon Public Key" do seu projeto Supabase. Esta chave é segura para ser exposta no frontend, pois concede acesso limitado (apenas operações permitidas por RLS) e é usada para inicializar o cliente Supabase antes que o usuário esteja autenticado.

## 2. Como Obter os Valores das Variáveis

1.  **Acesse o Painel do Supabase:** Faça login no seu painel do projeto Supabase.
2.  **Navegue para Configurações de API:** No menu lateral esquerdo, clique em **"Project Settings"** (o ícone de engrenagem) e depois em **"API"**.
3.  **Localize as Credenciais:**
    *   `VITE_SUPABASE_URL`: Você encontrará este valor como **"Project URL"**. Ele terá um formato semelhante a `https://[seu-projeto-id].supabase.co`.
    *   `VITE_SUPABASE_ANON_KEY`: Você encontrará este valor como **"Project API key (public)"** ou **"anon public"**. Copie o valor completo.

## 3. Configuração Local (`.env.local`)

Para o desenvolvimento local, você deve armazenar essas variáveis em um arquivo `.env.local` na raiz do seu projeto frontend.

1.  **Crie o arquivo `.env.local`:** Na raiz do diretório do seu projeto (ao lado do `package.json`), crie um novo arquivo chamado `.env.local`.
2.  **Adicione as Variáveis:** Cole os valores obtidos do painel do Supabase no arquivo `.env.local` no seguinte formato: