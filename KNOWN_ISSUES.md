# Problemas Conhecidos e Limitações Atuais

**Data:** 17 de Novembro de 2025

Este documento lista os problemas conhecidos, bugs e limitações da implementação atual do módulo de Atendimento Multicanal.

## 1. Falta de Paginação

-   **Problema:** As listas de conversas (`useConversations`) e mensagens (`useMessages`) atualmente buscam todos os registros de uma vez.
-   **Impacto:** Em um cenário de produção com milhares de conversas ou mensagens, isso causará problemas severos de performance, lentidão na interface e alto consumo de memória e banda.
-   **Solução Sugerida:** Implementar paginação "infinita" (infinite scroll). Os hooks devem ser modificados para buscar dados em lotes (ex: 30 conversas ou 50 mensagens por vez) à medida que o usuário rola a lista.

## 2. Filtro de Canal Ineficiente

-   **Problema:** A filtragem por canal em `fetchConversations` é feita em duas etapas (busca IDs de canal e depois filtra conversas), o que é ineficiente.
-   **Impacto:** Pode levar a uma performance de busca degradada à medida que o número de canais e conversas aumenta.
-   **Solução Sugerida:** Criar uma `view` no banco de dados que junte `conversations` e `channels` ou usar uma função RPC para realizar a busca filtrada diretamente no PostgreSQL.

## 3. Tratamento de Erros de Realtime

-   **Problema:** O feedback para o usuário em caso de falha na conexão Realtime é limitado. A aplicação pode parar de receber atualizações sem um aviso claro.
-   **Impacto:** O usuário pode pensar que não há novas mensagens, quando na verdade a conexão em tempo real foi perdida.
-   **Solução Sugerida:** Implementar um indicador de status de conexão Realtime na UI (ex: um ícone na barra de status). Adicionar lógica de reconexão automática com backoff exponencial nos hooks e exibir um `toast` ou `alert` para o usuário se a conexão for perdida por um período prolongado.

## 4. Atualização de "Última Mensagem" no Realtime

-   **Problema:** Quando uma nova mensagem chega, o `last_message` na lista de conversas não é atualizado automaticamente via Realtime, pois a query inicial que busca a última mensagem não é re-executada. O `last_message_at` é atualizado, o que reordena a lista, mas o texto da mensagem permanece o antigo.
-   **Impacto:** A UI exibe informações desatualizadas, confundindo o usuário.
-   **Solução Atual (Workaround):** O hook `useConversations` foi modificado para re-buscar toda a lista (`fetchInitialConversations`) ao receber um evento de `UPDATE`, o que resolve o problema, mas é ineficiente.
-   **Solução Sugerida:** Utilizar uma função RPC do Supabase que, ao receber uma nova mensagem, retorne o payload completo da conversa atualizada, incluindo a última mensagem.

## 5. Falta de Funcionalidades de Gerenciamento

-   **Problema:** Ações essenciais de gerenciamento de conversas ainda não foram implementadas.
-   **Funcionalidades Faltantes:**
    -   Arquivar/Desarquivar/Fechar uma conversa.
    -   Atribuir uma conversa a um atendente específico.
    -   Marcar uma conversa como lida/não lida manualmente.
    -   Adicionar tags ou notas a uma conversa.

## 6. Envio de Anexos

-   **Problema:** A funcionalidade de enviar anexos (imagens, documentos) através do `ChatInput` não está implementada.
-   **Solução Sugerida:** Integrar com o `Supabase Storage`. O fluxo seria:
    1.  O usuário seleciona um arquivo.
    2.  O arquivo é enviado para um bucket no Supabase Storage.
    3.  A URL do arquivo é obtida.
    4.  Uma nova mensagem é criada na tabela `messages` com a `media_url` preenchida.