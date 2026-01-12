# Plano de Integração WhatsApp

Este documento detalha o plano para integrar o WhatsApp ao módulo de Atendimento Multicanal, permitindo o envio e recebimento de mensagens através de uma API de mensageria.

## Visão Geral

A integração do WhatsApp será feita através de um provedor de API (ex: Z-API, Twilio, Meta Business API - **inicialmente Z-API**). A arquitetura dependerá de um workflow externo (como n8n) para intermediar a comunicação entre a API do WhatsApp e o Supabase Edge Functions, garantindo a padronização e o processamento de dados.

## 1. Atualizações de Banco de Dados (Implementadas no `MULTICHANNEL_TABLES_PLAN.md`)

*   **`channel_credentials`**: Armazenará tokens e configurações da API do WhatsApp.
*   **`contacts`**: Pode ter campos adicionais para metadados específicos do WhatsApp (ex: `whatsapp_data jsonb`).
*   **`conversations`**: O campo `channel` será `whatsapp` para estas conversas.
*   **`messages`**: Armazenará conteúdo, `media_url` para anexos, `status` (enviada, entregue, lida) e `raw_event` (o payload completo da API do WhatsApp para auditoria).

## 2. Supabase Edge Functions

### `n8n-webhook` (Aprimoramento)

*   **Função:** Receber eventos de mensagens **do n8n** (que por sua vez recebe da API do WhatsApp).
*   **Payload Esperado (do n8n):**