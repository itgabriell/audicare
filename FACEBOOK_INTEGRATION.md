# Plano de Integração Facebook Messenger

Este documento descreve o plano para integrar o Facebook Messenger ao módulo de Atendimento Multicanal.

## Visão Geral

A integração com o Facebook Messenger será feita através da API da Plataforma Messenger (parte da Meta Business API). Seguirá um padrão similar às outras integrações multicanais, utilizando um workflow externo (n8n ou similar) como intermediário.

## 1. Atualizações de Banco de Dados (Implementadas no `MULTICHANNEL_TABLES_PLAN.md`)

*   **`channel_credentials`**: Armazenará tokens de acesso e configurações da API do Facebook Messenger para cada clínica/página.
*   **`contacts`**: Será adaptada para identificar contatos pelo `external_id` (Facebook Page-scoped ID - PSID). O campo `channel_ids` (jsonb) será crucial para mapear IDs de diferentes canais para o mesmo contato.
*   **`conversations`**: O campo `channel` será `facebook` para estas conversas.
*   **`messages`**: Armazenará conteúdo, `media_url` para anexos (fotos, vídeos), e `raw_event` (o payload completo da API do Facebook Messenger).

## 2. Supabase Edge Functions

### `n8n-webhook` (Aprimoramento)

*   **Função:** Receber eventos de mensagens **do n8n** (que por sua vez recebe da Meta Business API para Facebook Messenger).
*   **Payload Esperado (do n8n):**