# Notas sobre Performance

**Data:** 17 de Novembro de 2025

Este documento aborda as considerações de performance da aplicação, destacando as otimizações implementadas e os pontos de atenção para futuras melhorias.

## 1. Otimizações Implementadas

-   **Uso de Realtime em Vez de Polling:** A aplicação utiliza as assinaturas Realtime do Supabase para receber atualizações de dados. Isso é significativamente mais eficiente do que fazer polling (requisições HTTP repetidas), pois reduz a carga no servidor e no cliente, além de diminuir a latência.

-   **Atualizações Otimistas:** Ao enviar uma mensagem (`useMessages`), a UI é atualizada instantaneamente com uma versão "otimista" da mensagem. Isso proporciona uma experiência de usuário fluida e responsiva, sem que o usuário precise esperar pela confirmação do servidor.

-   **Índices no Banco de Dados:** Foram criados índices nas colunas mais utilizadas em `WHERE` e `JOIN` (`clinic_id`, `contact_id`, `conversation_id`, etc.), o que acelera drasticamente as consultas de leitura no PostgreSQL.

-   **Seleção Específica de Colunas:** As queries em `messaging.js` foram, sempre que possível, escritas para selecionar apenas as colunas necessárias, em vez de `SELECT *`. Isso reduz a quantidade de dados transferidos pela rede.

-   **Memoização de Componentes (Implícito):** O uso de componentes funcionais com hooks e a estrutura do React ajudam a evitar re-renderizações desnecessárias. Componentes como `ConversationListItem` são otimizados para não re-renderizar a menos que suas props mudem.

## 2. Pontos de Atenção e Gargalos Potenciais

-   **Ausência de Paginação:** Como detalhado em `KNOWN_ISSUES.md`, a falta de paginação é o maior risco de performance. Carregar centenas ou milhares de conversas/mensagens de uma vez irá degradar severamente a performance da aplicação.
    -   **Recomendação:** Priorizar a implementação de "infinite scroll" nos hooks `useConversations` e `useMessages`.

-   **Assinaturas Realtime:** Cada cliente conectado abre uma conexão WebSocket e se inscreve em canais. Um número muito grande de clientes ou assinaturas muito "amplas" (sem filtros) pode sobrecarregar o servidor Realtime do Supabase.
    -   **Recomendação:** Manter as assinaturas o mais específicas possível, usando filtros (`filter: \`conversation_id=eq.${id}\``). Garantir que os canais sejam desinscritos (`removeChannel`) quando os componentes são desmontados.

-   **Complexidade das Queries:** Queries com múltiplos `JOIN`s, especialmente em `fetchConversations`, podem se tornar lentas.
    -   **Recomendação:** Monitorar a performance das queries usando `EXPLAIN ANALYZE` no SQL Editor do Supabase. Considerar o uso de `views` materializadas ou funções RPC para otimizar buscas complexas.

## 3. Próximos Passos para Otimização

1.  **Implementar Paginação:** Esta é a otimização de maior prioridade.
2.  **Otimizar `fetchConversations`:** Substituir a query atual por uma função RPC ou uma `view` que pré-calcule os dados necessários, evitando `JOIN`s complexos em tempo de execução.
3.  **Virtualização de Listas:** Para cenários com um número extremo de itens visíveis na tela, considerar o uso de bibliotecas de virtualização (como `react-window` ou `react-virtual`) para renderizar apenas os itens que estão na viewport.
4.  **Code Splitting (Divisão de Código):** Continuar utilizando `React.lazy()` para carregar páginas e componentes pesados sob demanda, melhorando o tempo de carregamento inicial da aplicação.
5.  **Cache de Dados:** Para dados que não mudam com frequência (como detalhes de um paciente já carregado), implementar uma camada de cache no lado do cliente para evitar requisições repetidas.