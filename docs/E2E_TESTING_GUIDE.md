# Guia de Testes End-to-End (E2E)

**Data:** 17 de Novembro de 2025

Este guia descreve os fluxos e cenários para a execução de testes End-to-End (E2E) no módulo de Atendimento Multicanal, garantindo que a aplicação funcione corretamente da perspectiva do usuário, do frontend ao backend.

## 1. Objetivo

O objetivo dos testes E2E é simular o uso real da aplicação por um usuário final para validar o fluxo completo do sistema, incluindo a interface do usuário, a lógica de negócios, a integração com a API e a persistência de dados no banco de dados.

## 2. Pré-requisitos

-   **Ambiente de Teste:** Um ambiente de homologação (staging) com uma versão de deploy da aplicação e conectado a um projeto Supabase de teste.
-   **Dados de Teste:** O banco de dados de teste deve ser populado com dados iniciais (clínicas, usuários, pacientes, etc.) usando o script de `TESTING_QUERIES.md`.
-   **Ferramentas:**
    -   Pelo menos dois navegadores diferentes (ex: Chrome, Firefox).
    -   Ferramentas de Desenvolvedor do navegador (para inspecionar a rede e o console).
    -   SQL Editor no painel do Supabase para simular eventos de backend.
    -   Um dispositivo móvel (ou emulador de navegador) para testes de responsividade.

## 3. Fluxos de Teste Principais

### 3.1. Teste de Fluxo de Conversa Completo

Este é o teste mais crítico, simulando uma interação completa.

1.  **Recebimento de Mensagem:**
    -   **Ação:** Use o SQL Editor do Supabase para inserir uma nova mensagem na tabela `public.messages`, simulando uma mensagem vinda de um contato externo. Preencha `sender_type` como `'contact'`.
    -   **Validação (Frontend):**
        -   A nova mensagem deve aparecer instantaneamente no `ChatWindow` da conversa correspondente, sem a necessidade de recarregar a página.
        -   Na `ConversationList`, a conversa deve subir para o topo da lista.
        -   O contador `unread_count` deve ser incrementado.
        -   O `last_message` na lista de conversas deve ser atualizado.

2.  **Envio de Resposta:**
    -   **Ação:** No `ChatInput` da conversa, digite uma resposta e clique em "Enviar".
    -   **Validação (Frontend):**
        -   A mensagem deve aparecer imediatamente no `ChatWindow` com um status visual de "enviando" (ex: opacidade reduzida).
        -   O campo de input deve ser limpo.
    -   **Validação (Backend):**
        -   Use o SQL Editor para verificar se a nova mensagem foi inserida corretamente na tabela `public.messages` com `sender_type` como `'user'`.
        -   A atualização otimista na UI deve ser substituída pelo registro real do banco de dados (o status de "enviando" deve desaparecer).

### 3.2. Teste de Filtros e Busca

1.  **Filtro por Canal:**
    -   **Ação:** Na `ConversationList`, use o `ChannelFilter` para selecionar "WhatsApp", "Instagram", etc.
    -   **Validação:** A lista de conversas deve ser atualizada para mostrar apenas as conversas do canal selecionado. Selecione "Todos" para reverter.

2.  **Filtro por Status:**
    -   **Ação:** Use o seletor de status para filtrar por "Ativas", "Arquivadas", etc.
    -   **Validação:** A lista deve ser atualizada para refletir o status selecionado.

3.  **Busca de Conversas:**
    -   **Ação:** Use o campo de busca para digitar o nome ou telefone de um contato de teste.
    -   **Validação:** A lista de conversas deve ser filtrada dinamicamente para mostrar apenas as conversas que correspondem ao termo de busca.

### 3.3. Teste de Dados do Contato e Agendamentos

1.  **Ação:** Selecione uma conversa de um contato que está associado a um paciente com agendamentos.
2.  **Validação:**
    -   No `ContactPanel`, verifique se o nome, avatar e outros detalhes do contato são exibidos corretamente.
    -   Navegue para a aba "Agenda".
    -   Verifique se a lista de agendamentos futuros do paciente associado é exibida corretamente, com as datas e notas corretas.

### 3.4. Teste de Status da Mensagem (Simulado)

1.  **Ação:** Após enviar uma mensagem, use o SQL Editor para atualizar o `status` da mensagem na tabela `public.messages` de `'sent'` para `'delivered'` e depois para `'read'`.
2.  **Validação:** Verifique se a UI reflete essas mudanças de status em tempo real (ex: com ícones de "check" duplo, que precisariam ser implementados).

## 4. Cenários de Teste Avançados

### 4.1. Teste de Múltiplas Abas (Sincronização Realtime)

1.  **Ação:** Abra a página "Caixa de Entrada" em duas abas diferentes do mesmo navegador, logado na mesma conta.
2.  **Cenário 1: Enviar Mensagem**
    -   Em uma aba, envie uma mensagem em uma conversa.
    -   **Validação:** A mensagem enviada deve aparecer instantaneamente na outra aba.
3.  **Cenário 2: Receber Mensagem**
    -   Simule o recebimento de uma mensagem via SQL Editor.
    -   **Validação:** A mensagem recebida deve aparecer em ambas as abas ao mesmo tempo.

### 4.2. Teste em Diferentes Navegadores (Cross-Browser)

1.  **Ação:** Execute os principais fluxos de teste (conversas, envio/recebimento) nos seguintes navegadores:
    -   Google Chrome (versão mais recente)
    -   Mozilla Firefox (versão mais recente)
    -   Safari (versão mais recente, se disponível)
    -   Microsoft Edge (versão mais recente)
2.  **Validação:** Verifique se a aplicação se comporta de forma consistente e se não há quebras de layout ou erros de funcionalidade específicos de um navegador.

### 4.3. Teste em Dispositivos Móveis

1.  **Ação:** Acesse a aplicação em um smartphone ou use o modo de emulação de dispositivo do navegador.
2.  **Validação:**
    -   **Layout Responsivo:** Verifique se a `ConversationList` ocupa a tela inteira inicialmente.
    -   **Navegação:** Clicar em uma conversa deve esconder a lista e mostrar o `ChatWindow`. O botão "Voltar" no `ChatWindow` deve retornar para a `ConversationList`.
    -   **Usabilidade:** Verifique se os botões, inputs e outros elementos de UI são fáceis de tocar e usar em uma tela menor.
    -   **Performance:** Avalie a fluidez da aplicação em um dispositivo móvel real.