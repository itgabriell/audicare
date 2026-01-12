# Documentação da API (messaging.js)

Este documento descreve as funções disponíveis no módulo `src/lib/messaging.js`, que serve como a camada de acesso a dados (Data Access Layer) para as funcionalidades de atendimento multicanal, interagindo diretamente com o Supabase.

## 1. Funções de Leitura (Fetch)

---

### `fetchConversations(clinicId, filters)`
Busca uma lista de conversas para uma clínica, com suporte a filtros.

-   **Parâmetros:**
    -   `clinicId` (string, obrigatório): O UUID da clínica.
    -   `filters` (object, opcional): Objeto com filtros.
        -   `status` (string): Filtra por status ('active', 'archived', 'closed').
        -   `channel` (string): Filtra por tipo de canal ('whatsapp', 'instagram', etc.).
-   **Exemplo de Uso (JS):**