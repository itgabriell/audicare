# 📱 Configuração do Webhook UAZAPI - Guia Rápido

## ✅ O que você já fez:
- ✅ Conectou o número do WhatsApp no UAZAPI

## ⚠️ O que ainda precisa fazer:

### 1️⃣ Obter a URL do Webhook

No sistema Audicare:
1. Acesse **Configurações** (⚙️) no menu lateral
2. Vá para a aba **Webhooks**
3. Copie a **URL do Endpoint** que aparece lá

A URL será algo como:
```
https://[SEU_PROJECT_REF].supabase.co/functions/v1/zapi-webhook
```

### 2️⃣ Configurar o Token de Segurança

**Opção A: Via Supabase Dashboard (Recomendado)**
1. Acesse o Supabase Dashboard
2. Vá em **Edge Functions** > **Secrets**
3. Adicione uma nova secret:
   - **Nome**: `Z_API_SECURITY_TOKEN`
   - **Valor**: Gere uma string aleatória forte (ex: use um UUID gerador online)
4. **Copie esse token** - você vai precisar dele

**Opção B: Usar um token existente**
- Se já existe um token configurado, use o mesmo

### 3️⃣ Configurar o Webhook no UAZAPI

No painel do UAZAPI/Z-API:

1. Acesse a configuração de **Webhooks** da sua instância
2. Configure os seguintes eventos:
   - ✅ **on-message-received** (mensagens recebidas)
   - ✅ **on-message-status-changed** (atualizações de status)

3. Cole a URL do webhook (copiada no passo 1)

4. Configure o token de segurança de uma das formas:

   **Se suporta Headers:**
   - Adicione um header:
     - **Nome**: `X-ZAPI-Security-Token`
     - **Valor**: [o token que você gerou/copiou]

   **Se não suporta Headers (apenas URL):**
   - Adicione o token na URL:
   ```
   https://[SEU_PROJECT_REF].supabase.co/functions/v1/zapi-webhook?token=SEU_TOKEN_AQUI
   ```

### 4️⃣ Verificar se está funcionando

1. **No sistema Audicare:**
   - Acesse **Configurações** > **Webhooks**
   - Clique em **Testar Conexão**
   - Deve aparecer "✅ Ativo"

2. **Teste prático:**
   - Envie uma mensagem para o número conectado do WhatsApp
   - Verifique se a mensagem aparece no **Inbox** do sistema
   - Deve aparecer em alguns segundos

## 🔍 Troubleshooting

### ❌ Mensagens não aparecem no sistema
- Verifique se o webhook está configurado corretamente no UAZAPI
- Verifique se o token está correto (deve ser o mesmo no Supabase e UAZAPI)
- Veja os logs da Edge Function no Supabase Dashboard

### ❌ Erro 401 Unauthorized
- O token de segurança não está correto
- Verifique se usou o mesmo token no Supabase Secrets e no UAZAPI

### ❌ Erro 404 Not Found
- A Edge Function `zapi-webhook` não foi deployada
- Execute: `supabase functions deploy zapi-webhook`

## 📝 Resumo Rápido

1. ✅ Copiar URL do webhook (Configurações > Webhooks)
2. ✅ Gerar/obter token de segurança
3. ✅ Configurar no Supabase Secrets (`Z_API_SECURITY_TOKEN`)
4. ✅ Configurar webhook no UAZAPI com a URL e token
5. ✅ Testar enviando uma mensagem

---

**Dica:** Use a página de Configurações > Webhooks do sistema para obter a URL correta automaticamente!

