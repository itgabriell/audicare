# Guia de Performance e Otimizações

Este documento descreve as práticas de otimização implementadas no sistema e os limites a serem considerados para garantir a performance.

### Otimizações Implementadas

1.  **Seleção Específica de Colunas (`select`)**
    *   As queries ao banco de dados, especialmente nos hooks `useConversations` e `useMessages`, foram escritas para selecionar apenas as colunas necessárias (`id, name, ...`) em vez de `select(*)`.
    *   **Benefício:** Reduz o tráfego de dados entre o cliente e o Supabase e diminui a carga no banco de dados.

2.  **Paginação (Limiting and Offsetting)**
    *   Para evitar carregar milhares de registros de uma vez, implementamos paginação nas buscas de dados.
    *   `getConversations`: Carrega conversas em lotes de 30.
    *   `getMessages`: Carrega mensagens em lotes de 50.
    *   **Benefício:** Garante que a carga inicial da aplicação seja rápida, buscando mais dados apenas quando necessário (ex: scroll infinito, a ser implementado).

3.  **Uso de Funções RPC para Operações Complexas**
    *   Para o recebimento de uma nova mensagem, que envolve múltiplas etapas (procurar/criar contato, procurar/criar conversa, inserir mensagem), utilizamos uma única função RPC no banco de dados (`handle_incoming_message`).
    *   **Benefício:** Reduz a latência ao executar toda a lógica no servidor de banco de dados em uma única chamada de rede, além de garantir a atomicidade da operação (tudo ou nada).

4.  **Índices no Banco de Dados**
    *   O esquema do banco de dados foi projetado com índices nas colunas mais consultadas, como `clinic_id`, `contact_id`, `conversation_id`, e `phone`.
    *   **Benefício:** Índices são cruciais para acelerar as operações de `SELECT`, `UPDATE` e `JOIN`, especialmente em tabelas grandes.

5.  **Componentes Memoizados (`React.memo`)**
    *   Componentes de UI que são renderizados em listas (`ConversationListItem`, `ChatMessage`) foram envolvidos em `React.memo`.
    *   **Benefício:** Evita re-renderizações desnecessárias quando as `props` não mudam, melhorando a performance da interface, especialmente em listas longas.

### Limites e Pontos de Atenção

1.  **Limites da API do Supabase:**
    *   Projetos no plano gratuito do Supabase têm limites de uso da API (requisições por segundo). Picos de tráfego podem levar a respostas de erro `429 Too Many Requests`.
    *   **Mitigação:** Para integrações de alto volume, considere um upgrade no plano do Supabase ou a implementação de `rate limiting` no lado do cliente.

2.  **Limites do Realtime:**
    *   O serviço de Realtime do Supabase também tem um limite de conexões simultâneas e de mensagens por segundo.
    *   **Mitigação:**
        *   Crie canais específicos e com filtros (ex: `channel('public:messages:conversation_id=eq.${id}')`). Isso garante que os clientes recebam apenas os eventos que lhes interessam.
        *   Sempre desinscreva-se dos canais (`supabase.removeChannel(channel)`) quando o componente for desmontado para liberar recursos.

3.  **Performance de Edge Functions:**
    *   Edge Functions têm limites de tempo de execução (geralmente alguns segundos) e de memória.
    *   **Mitigação:** Mantenha as funções leves e rápidas. Para tarefas pesadas e demoradas (ex: processar um grande relatório), considere o uso de `background functions` (se disponível no seu plano) ou delegue o processamento para um serviço externo.

### Escalabilidade Futura

*   **Escalonamento da Base de Dados:** O fator limitante principal em alta escala será o banco de dados. O Supabase oferece planos com mais recursos de computação. Monitore a saúde do banco em **Reports -> Database Health**.
*   **Múltiplas Clínicas:** A arquitetura com RLS (Row Level Security) baseada em `clinic_id` escala horizontalmente de forma nativa. Cada clínica opera em seus próprios dados, evitando contenção. O sistema está pronto para suportar múltiplas clínicas sem alterações na arquitetura principal.