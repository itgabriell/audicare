# Guia de Integração com n8n - AudiCare

Este documento detalha a API RESTful para integração entre o sistema AudiCare e o n8n. A API permite gerenciar contatos, conversas e mensagens, além de receber eventos via webhooks.

## Autenticação

Todas as requisições à API devem incluir um token de autenticação do Supabase no cabeçalho `Authorization`.

- **Header**: `Authorization`
- **Value**: `Bearer <SUPABASE_ANON_KEY>`

Além disso, para operações que modificam dados (POST, PUT, DELETE), o ID do usuário que está realizando a ação deve ser enviado no header `x-user-id` para verificação de permissões no backend.

- **Header**: `x-user-id`
- **Value**: `<USER_UUID>`

## Base URL

A URL base para os endpoints é composta pelo seu Supabase URL e o nome da Edge Function correspondente.

- **Gateway**: `https://<PROJECT_REF>.supabase.co/functions/v1/n8n-gateway`
- **Webhook**: `https://<PROJECT_REF>.supabase.co/functions/v1/n8n-webhook`

---

## Endpoints

### Webhook

#### 1. Receber Mensagens (n8n-webhook)

Este endpoint é projetado para receber novas mensagens de plataformas externas (como WhatsApp via n8n) e inseri-las no sistema.

- **URL**: `/n8n-webhook`
- **Método**: `POST`
- **Headers**:
  - `Content-Type: application/json`

**Corpo da Requisição (Exemplo):**