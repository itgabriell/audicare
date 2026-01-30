# Guia de Monitoramento e Manutenção

Este guia aborda as práticas recomendadas para monitorar a saúde da aplicação, garantir sua estabilidade e planejar atualizações futuras.

## Monitoramento em Produção

O painel do Supabase é a principal ferramenta para monitoramento.

### 1. Logs Gerais

*   **Onde encontrar:** Painel do Supabase -> **Logs**.
*   **O que monitorar:**
    *   **`Database`:** Monitore por queries lentas ou erros de SQL. Queries que consistentemente levam mais de 200-300ms devem ser investigadas. Elas podem indicar a necessidade de um novo índice.
    *   **`API`:** Verifique os logs de requisições. Fique atento a picos de erros `4xx` (erros do cliente, ex: autorização negada pela RLS) ou `5xx` (erros do servidor). Erros `429 (Too Many Requests)` indicam que você pode estar atingindo os limites de uso da API.

### 2. Logs das Edge Functions

*   **Onde encontrar:** Painel do Supabase -> **Edge Functions** -> Selecione a função (`n8n-webhook`, etc.).
*   **O que monitorar:**
    *   **`n8n-webhook`:** Monitore erros de processamento de payload ou falhas ao chamar a função RPC `handle_incoming_message`. `console.log` dentro das funções são a principal ferramenta de depuração. Erros aqui geralmente indicam um JSON malformado enviado pelo n8n.

### 3. Saúde do Banco de Dados e Uso

*   **Onde encontrar:** Painel do Supabase -> **Reports**.
*   **O que monitorar:**
    *   **`Database Health`:** Monitore `CPU Usage` e `RAM Usage`. Picos podem indicar queries ineficientes.
    *   **`Query Performance`:** Identifique as queries mais lentas e mais frequentes. Use o botão `EXPLAIN` para analisar o plano de execução e otimizar se necessário.
    *   **`API Usage`:** Visualize o número de requisições e a quantidade de dados trafegados.

## Manutenção e Atualizações

### 1. Escalando para Múltiplas Clínicas

O sistema foi projetado para ser multi-tenant desde o início, graças à RLS baseada em `clinic_id`.

*   **Como adicionar:** Basta que um novo usuário se cadastre e crie uma nova clínica através da interface da aplicação. O sistema de RLS garantirá automaticamente o isolamento dos dados. Não são necessárias alterações na arquitetura.
*   **Performance:** O principal ponto de atenção ao escalar é a performance do banco de dados. Se o número de clínicas e o volume de dados crescerem significativamente, pode ser necessário fazer um upgrade do plano do Supabase para obter mais recursos computacionais.

### 2. Adicionando Novos Tipos de Relacionamento (`contact_relationships`)

A tabela `contact_relationships` é projetada para ser extensível, ligando um `contact` a outras entidades como `patients` ou `repairs`.

*   **Como adicionar:**
    1.  **Alterar o `enum`:** Adicione o novo tipo de entidade (ex: `supplier`) ao tipo `enum` `related_entity` no banco de dados.