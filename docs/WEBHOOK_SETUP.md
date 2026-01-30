# Configurando o Webhook no n8n

Este guia mostra como configurar um workflow simples no n8n para capturar mensagens de um serviço (como o WhatsApp) e enviá-las para o endpoint de webhook do AudiCare.

## Pré-requisitos

1.  **URL do Webhook**: Você precisa da URL completa do seu endpoint `n8n-webhook`.
    - Exemplo: `https://<PROJECT_REF>.supabase.co/functions/v1/n8n-webhook`
2.  **ID da Clínica**: O UUID da clínica que receberá as mensagens.

## Passos para Configurar o Workflow

### 1. Nó de Gatilho (Trigger Node)

O primeiro nó do seu workflow deve ser o gatilho que recebe os dados da plataforma de mensagens. Pode ser um nó `Webhook`, um nó `WhatsApp Business`, ou qualquer outro que forneça os dados da mensagem recebida.

### 2. Nó "Set" (Opcional, mas Recomendado)

É uma boa prática usar um nó `Set` para mapear e preparar os dados antes de enviá-los ao webhook. Isso torna seu workflow mais legível e fácil de depurar.

- **Mode**: `Set`
- **Keep Only Set**: `true` (para enviar apenas os dados definidos)

**Configurações (Values):**

| Name              | Value                                            |
| ----------------- | ------------------------------------------------ |
| `clinic_id`       | `uuid-da-sua-clinica` (valor fixo)                 |
| `contact_phone`   | `{{ $json.body.sender.phone }}` (ajuste conforme seu gatilho) |
| `contact_name`    | `{{ $json.body.sender.name }}`  (ajuste conforme seu gatilho) |
| `message_content` | `{{ $json.body.message.text }}` (ajuste conforme seu gatilho) |
| `media_url`       | `{{ $json.body.message.mediaUrl }}` (opcional, ajuste) |

*Nota: As expressões `{{ ... }}` são exemplos. Você deve ajustá-las para corresponder à estrutura de dados exata fornecida pelo seu nó de gatilho.*

### 3. Nó "HTTP Request"

Este é o nó que efetivamente envia os dados para o AudiCare.

- **Authentication**: `None` (a autenticação é feita via headers no gateway, mas o webhook é público)
- **Method**: `POST`
- **URL**: `https://<PROJECT_REF>.supabase.co/functions/v1/n8n-webhook`
- **Send Body**: `true`
- **Body Content Type**: `JSON`
- **JSON/RAW Parameters**: `true`

**Corpo (Body):**
No campo `Body`, você pode referenciar os dados do nó anterior (o `Set` ou o gatilho).