# Plano de Integração Instagram Direct Messenger

Este documento descreve o plano para integrar o Instagram Direct Messenger (DMs) ao módulo de Atendimento Multicanal.

## Visão Geral

A integração com o Instagram DMs será feita através da API oficial do Instagram para Mensagens (parte da Meta Business API). Similar ao WhatsApp, um workflow externo (n8n ou similar) atuará como intermediário.

## 1. Atualizações de Banco de Dados (Implementadas no `MULTICHANNEL_TABLES_PLAN.md`)

*   **`channel_credentials`**: Armazenará tokens de acesso e configurações da API do Instagram para cada clínica.
*   **`contacts`**: Será crucial adaptar esta tabela para identificar contatos pelo `external_id` (Instagram User ID) em vez de `phone`. O campo `channel_ids` (jsonb) será fundamental para armazenar os IDs de diferentes canais para o mesmo contato.
*   **`conversations`**: O campo `channel` será `instagram` para estas conversas.
*   **`messages`**: Armazenará conteúdo, `media_url` para anexos (fotos, vídeos), e `raw_event` (o payload completo da API do Instagram).

## 2. Supabase Edge Functions

### `n8n-webhook` (Aprimoramento)

*   **Função:** Receber eventos de mensagens **do n8n** (que por sua vez recebe da Meta Business API para Instagram).
*   **Payload Esperado (do n8n):**