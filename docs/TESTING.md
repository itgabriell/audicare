# Guia de Testes Manuais

Este documento descreve os passos para testar manualmente os principais fluxos da aplicação, garantindo que tudo funcione como esperado.

**Ferramentas Recomendadas:**
*   `curl` (linha de comando)
*   Postman ou Insomnia (para uma interface gráfica)

**Pré-requisitos:**
*   `SUPABASE_URL`: A URL do seu projeto Supabase.
*   `CLINIC_ID`: O UUID de uma clínica de teste.
*   `USER_ID`: O UUID de um usuário de teste válido no sistema (membro da clínica).

---

### Teste 1: Recebimento de Mensagem via Webhook (`n8n-webhook`)

Este teste valida o fluxo de entrada de uma nova mensagem no sistema, como se viesse do n8n.

*   **Endpoint**: `n8n-webhook`
*   **Método**: `POST`
*   **URL**: `{{SUPABASE_URL}}/functions/v1/n8n-webhook`
*   **Headers**:
    *   `Content-Type: application/json`
*   **Corpo da Requisição (JSON):**