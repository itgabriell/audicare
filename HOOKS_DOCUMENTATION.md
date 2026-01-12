# Documentação dos Hooks do Módulo de Caixa de Entrada

Este documento detalha os hooks personalizados (`useConversations`, `useMessages`) utilizados no módulo de Atendimento Multicanal, suas funcionalidades, gerenciamento de estado e interação com o Supabase Realtime.

## 1. `useConversations.js`

### Objetivo
Gerenciar o carregamento, a atualização em tempo real e o estado das conversas de uma clínica específica.

### Como Funciona
1.  **Carregamento Inicial:** Ao montar, o hook tenta buscar a lista de conversas associadas ao `clinic_id` do usuário autenticado (obtido via `useAuth`). Ele usa a função `getConversations` do `lib/messaging.js`.
2.  **Estado:** Gerencia o array de `conversations`, o estado de `loading` e `error` usando um `useReducer` para lógica de estado mais complexa e consistente.
3.  **Realtime:** Subscreve-se a alterações nas tabelas `conversations` e `messages` no Supabase.
    *   Qualquer `INSERT`, `UPDATE` ou `DELETE` na tabela `conversations` para a `clinic_id` do usuário autenticado.
    *   Qualquer `INSERT` na tabela `messages` para a `clinic_id` do usuário autenticado (pois uma nova mensagem pode afetar o `last_message_at` e `unread_count` de uma conversa).
4.  **Atualização de Dados:** Quando um evento em tempo real ocorre, o hook aciona um re-fetch completo das conversas (`fetchInitialConversations`) para garantir que a lista esteja sempre atualizada, ordenada e consistente. Este é um método robusto para lidar com atualizações complexas que afetam múltiplos campos ou a ordem da lista.
5.  **Limpeza:** Desinscreve-se do canal em tempo real quando o componente que utiliza o hook é desmontado.

### Parâmetros
*   Nenhum (obtém `profile` via `useAuth`).

### Retorno
Um objeto contendo:
*   `conversations` (Array): Lista de objetos de conversa, ordenada por `last_message_at` decrescente.
*   `loading` (Boolean): Indica se os dados estão sendo carregados.
*   `error` (String | null): Mensagem de erro, se houver.
*   `refresh` (Function): Uma função para recarregar manualmente as conversas.

### Exemplo de Uso