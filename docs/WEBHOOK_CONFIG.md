# Webhook Configuration Guide for UAZAPI

This guide explains how to configure incoming webhooks to receive messages, status updates, and media files from WhatsApp directly into the AudiCare system.

## 1. Webhook Endpoint

**IMPORTANTE:** O webhook é recebido diretamente pelo backend na VPS, NÃO pelo Supabase.

**Endpoint URL:** 
```
https://api.audicarefono.com.br/api/wa/webhook
```

## 2. Security Configuration

O backend na VPS deve validar os webhooks recebidos do UAZAPI.

1.  **Configurar Token no Backend:**
    *   No backend (VPS), configure uma variável de ambiente: `WEBHOOK_SECRET_TOKEN`
    *   Gere um token seguro aleatório (ex: UUID)

2.  **Configurar no UAZAPI:**
    *   No painel do UAZAPI, vá em "Webhooks" ou "Configurações de Webhook"
    *   Configure a URL: `https://api.audicarefono.com.br/api/wa/webhook`
    *   Se o UAZAPI suporta headers, adicione:
        - Header: `X-Webhook-Token`
        - Valor: `<seu-token-configurado-no-backend>`
    *   Se não suporta headers, adicione na URL: `?token=SEU_TOKEN`

## 3. Supported Events
The handler processes the following event types automatically:
*   **on-message-received**: Text, Image, Audio, Document messages from contacts.
*   **on-message-status-changed**: Delivery updates (Sent -> Delivered -> Read).

## 4. Data Flow
1.  **Deduplication**: Checks `wa_message_id` to prevent duplicate processing.
2.  **Contact Matching**: Matches incoming phone number to `contacts` table.
    *   If not found, creates a new Contact automatically.
3.  **Conversation**: Updates existing conversation or creates a new one.
4.  **Persistence**: Saves message to `messages` table with `inbound` direction.
5.  **Realtime**: Frontend subscriptions to `messages` table update the UI instantly.

## 5. Troubleshooting
*   **401 Unauthorized**: Check if `Z_API_SECURITY_TOKEN` matches the token sent by Z-API.
*   **500 Error**: Check Supabase Edge Function logs for detailed stack traces.
*   **Duplicate Messages**: Ensure Z-API is not retrying successfully processed requests (idempotency is handled, but retries waste resources).