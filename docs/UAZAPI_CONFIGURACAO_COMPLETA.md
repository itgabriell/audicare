# 📱 Configuração Completa UAZAPI - Audicare

## 🏗️ Arquitetura do Sistema

```
┌─────────────┐         ┌──────────────────┐         ┌──────────┐
│  Frontend   │────────▶│  Backend VPS     │────────▶│  UAZAPI  │
│  (React)    │  HTTPS  │ api.audicarefono │  HTTPS  │ (WhatsApp│
│             │         │    .com.br       │         │   API)   │
└─────────────┘         └──────────────────┘         └──────────┘
       │                        │                           │
       │                        │                           │
       │                ┌───────▼────────┐                  │
       │                │  Supabase DB   │                  │
       └────────────────│   (Persist)    │◀─────────────────┘
              Realtime  │                │      Webhook
              (Poll)    └────────────────┘   (POST /api/wa/webhook)
```

### Fluxo de Dados

#### 1. **Envio de Mensagem (Frontend → Contato)**
```
Frontend → Backend VPS (/api/wa/send-text) → UAZAPI → WhatsApp
```

#### 2. **Recebimento de Mensagem (Contato → Frontend)**
```
WhatsApp → UAZAPI → Backend VPS (/api/wa/webhook) → Supabase DB → Frontend (via polling/realtime)
```

---

## ✅ Configurações Necessárias

### 1. **Backend VPS (api.audicarefono.com.br)**

O backend na VPS deve estar configurado com:

#### Endpoints Esperados:
- `GET /api/wa/health-check` - Status da conexão UAZAPI
- `GET /api/wa/contacts` - Lista de contatos
- `GET /api/wa/chat-history/:phone` - Histórico de mensagens
- `POST /api/wa/send-text` - Enviar mensagem de texto
- `POST /api/wa/send-media` - Enviar mídia
- `POST /api/wa/webhook` - **Receber webhooks do UAZAPI** ⚠️ CRÍTICO

#### Autenticação:
- Todas as requisições devem incluir: `Authorization: Bearer <SUPABASE_TOKEN>`
- O backend valida o token do Supabase antes de processar

#### Configuração UAZAPI no Backend:
O backend deve ter configurado:
- `UAZAPI_BASE_URL` - URL base da API UAZAPI
- `UAZAPI_INSTANCE_ID` - ID da instância
- `UAZAPI_API_TOKEN` - Token de autenticação
- `WEBHOOK_SECRET_TOKEN` - Token para validar webhooks recebidos

---

### 2. **Webhook do UAZAPI** ⚠️ CONFIGURAÇÃO CRÍTICA

#### URL do Webhook:
```
https://api.audicarefono.com.br/api/wa/webhook
```

**NÃO é:**
- ❌ Supabase Edge Function
- ❌ `...supabase.co/functions/v1/zapi-webhook`
- ❌ Qualquer outra URL

**É:**
- ✅ Seu backend na VPS: `https://api.audicarefono.com.br/api/wa/webhook`

#### Eventos a Configurar no UAZAPI:
- ✅ `on-message-received` (mensagens recebidas)
- ✅ `on-message-status-changed` (status de entrega)
- ✅ `on-qr-code` (se quiser monitorar QR code)
- ✅ `on-connection-update` (status de conexão)

#### Headers (se suportado pelo UAZAPI):
```
X-Webhook-Token: <WEBHOOK_SECRET_TOKEN>
```

Ou via Query Param:
```
https://api.audicarefono.com.br/api/wa/webhook?token=<WEBHOOK_SECRET_TOKEN>
```

---

### 3. **Frontend (Este Sistema)**

#### Variáveis de Ambiente (.env):
```env
VITE_API_BASE_URL=https://api.audicarefono.com.br/api
VITE_SUPABASE_URL=https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY=[sua-chave-anon]
```

#### Endpoints Utilizados:
Todos os endpoints estão em `src/config/apiConfig.js` e apontam para:
- Base: `https://api.audicarefono.com.br/api`
- WhatsApp: `/api/wa/*`

---

## 🔧 Passo a Passo de Configuração

### Passo 1: Configurar Backend VPS

1. **Instalar dependências e configurar nginx** (se necessário)
2. **Configurar variáveis de ambiente no backend:**
   ```env
   UAZAPI_BASE_URL=https://api.uazapi.com.br
   UAZAPI_INSTANCE_ID=seu-instance-id
   UAZAPI_API_TOKEN=seu-token-aqui
   WEBHOOK_SECRET_TOKEN=token-seguro-aleatorio
   ```

3. **Garantir que o endpoint `/api/wa/webhook` está ativo e funcional**

4. **Testar o endpoint manualmente:**
   ```bash
   curl -X POST https://api.audicarefono.com.br/api/wa/webhook \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Token: seu-token" \
     -d '{"test": true}'
   ```

### Passo 2: Configurar UAZAPI

1. **Acessar painel do UAZAPI**
2. **Ir em Webhooks / Configurações**
3. **Configurar URL:**
   ```
   https://api.audicarefono.com.br/api/wa/webhook
   ```
4. **Adicionar token de segurança** (se suportado):
   - Header: `X-Webhook-Token: seu-token-aqui`
   - Ou na URL: `?token=seu-token-aqui`

5. **Ativar eventos:**
   - `on-message-received`
   - `on-message-status-changed`

6. **Salvar configuração**

### Passo 3: Verificar no Sistema

1. **Acessar o Inbox no sistema**
2. **Verificar status de conexão** (deve mostrar "Conectado")
3. **Enviar mensagem de teste**
4. **Verificar se mensagens recebidas aparecem no sistema**

---

## 🔍 Troubleshooting

### ❌ Mensagens não aparecem no sistema

**Verificar:**
1. Webhook está configurado corretamente no UAZAPI?
2. URL do webhook aponta para `api.audicarefono.com.br/api/wa/webhook`?
3. Token de segurança está correto (se configurado)?
4. Backend está processando os webhooks? (ver logs)
5. Backend está salvando no Supabase? (verificar banco)

**Teste manual do webhook:**
```bash
# Simular webhook do UAZAPI
curl -X POST https://api.audicarefono.com.br/api/wa/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: seu-token" \
  -d '{
    "event": "on-message-received",
    "data": {
      "phone": "5511999999999",
      "message": "Teste",
      "messageId": "test-123"
    }
  }'
```

### ❌ Não consigo enviar mensagens

**Verificar:**
1. Backend está acessível? (`/api/wa/health-check`)
2. UAZAPI está conectado? (verificar no painel UAZAPI)
3. Token de autenticação do frontend está válido?
4. Ver logs do backend para erros

### ❌ Erro 401/403 no webhook

**Causa:** Token de segurança não está correto

**Solução:**
1. Verificar se o token no backend é o mesmo configurado no UAZAPI
2. Verificar se está sendo enviado corretamente (header ou query param)

---

## 📋 Checklist Final

- [ ] Backend VPS configurado e acessível
- [ ] Endpoint `/api/wa/webhook` funcionando
- [ ] Variáveis de ambiente do backend configuradas
- [ ] UAZAPI conectado e ativo
- [ ] Webhook configurado no UAZAPI com URL correta
- [ ] Token de segurança configurado (backend e UAZAPI)
- [ ] Eventos corretos ativados no UAZAPI
- [ ] Teste de envio funcionando
- [ ] Teste de recebimento funcionando
- [ ] Mensagens aparecendo no sistema em tempo real

---

## 🔐 Segurança

1. **Nunca exponha tokens no frontend**
2. **Use HTTPS sempre**
3. **Valide webhooks com token de segurança**
4. **Rate limiting no endpoint de webhook**
5. **Logs de segurança para auditoria**

---

**Última atualização:** Dezembro 2024
**Versão:** 1.0

