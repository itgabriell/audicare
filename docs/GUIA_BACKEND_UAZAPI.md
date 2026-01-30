# 🔧 Guia para Backend: Integração UAZAPI Completa

Este documento descreve exatamente o que o backend precisa fazer para garantir que mensagens não dupliquem e fotos de contatos apareçam.

---

## 1. 🚫 Prevenção de Duplicação de Mensagens

### Problema:
Mensagens estão duplicando porque o backend pode não estar:
- Extraindo `wa_message_id` do payload do UAZAPI
- Salvando `wa_message_id` no banco
- Usando UPSERT para prevenir duplicatas

### ✅ Solução:

#### Passo 1: Extrair `wa_message_id` do Payload

Quando o UAZAPI envia um webhook, o payload pode ter esta estrutura (exemplo):

```json
{
  "event": "on-message-received",
  "data": {
    "id": "3EB0C767F26C81A6",  // ⚠️ ESTE É O wa_message_id
    "phone": "5511999999999",
    "text": "Mensagem recebida",
    "timestamp": 1234567890
  }
}
```

**O backend DEVE extrair esse `id` e salvar como `wa_message_id`:**

```javascript
// Exemplo de processamento do webhook
const waMessageId = payload.data?.id || payload.id || payload.messageId;
// ⚠️ IMPORTANTE: Sempre tentar múltiplas possibilidades, estrutura pode variar
```

#### Passo 2: Usar UPSERT no Banco de Dados

**Opção A: Usar `INSERT ... ON CONFLICT` (PostgreSQL):**

```sql
INSERT INTO messages (
  wa_message_id,
  conversation_id,
  contact_id,
  clinic_id,
  content,
  sender_type,
  direction,
  created_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (wa_message_id) DO NOTHING
RETURNING id;
```

**Importante:** Isso só funciona se houver um índice único em `wa_message_id`:

```sql
-- Se não existe, criar:
CREATE UNIQUE INDEX IF NOT EXISTS messages_wa_message_id_unique 
ON messages(wa_message_id) 
WHERE wa_message_id IS NOT NULL;
```

**Opção B: Verificar antes de inserir:**

```javascript
// Verificar se já existe
const { data: existing } = await supabase
  .from('messages')
  .select('id')
  .eq('wa_message_id', waMessageId)
  .maybeSingle();

if (existing) {
  // Já existe, não inserir novamente
  return { id: existing.id, duplicate: true };
}

// Inserir apenas se não existe
const { data, error } = await supabase
  .from('messages')
  .insert({
    wa_message_id: waMessageId,
    // ... outros campos
  });
```

#### Passo 3: Sempre Salvar `wa_message_id`

**IMPORTANTE:** Mesmo que o UAZAPI não envie um `id` explícito, o backend deve:
1. Tentar extrair de múltiplos campos possíveis
2. Se não encontrar, criar um ID temporário baseado no payload
3. **NUNCA** salvar mensagem sem algum tipo de identificador

---

## 2. 📸 Fotos de Perfil dos Contatos

### Problema:
Fotos não aparecem porque o backend não está buscando/salvando o `avatar_url` dos contatos.

### ✅ Solução:

#### Passo 1: Extrair Foto do Payload do UAZAPI

O webhook do UAZAPI pode incluir foto de perfil no payload:

```json
{
  "event": "on-message-received",
  "data": {
    "from": "5511999999999",
    "text": "Mensagem",
    "sender": {
      "name": "Nome do Contato",
      "profilePicture": "https://scontent.whatsapp.net/..."  // ⚠️ ESTA URL
    }
  }
}
```

**O backend DEVE extrair essa URL:**

```javascript
const avatarUrl = payload.data?.sender?.profilePicture || 
                  payload.sender?.avatar || 
                  payload.profilePicture ||
                  null;
```

#### Passo 2: Buscar Foto via API do UAZAPI (se não veio no webhook)

Se o webhook não inclui a foto, o backend pode buscar via API:

```javascript
// Exemplo de busca de foto de perfil
async function getProfilePicture(phone, instanceId, apiToken) {
  try {
    const response = await fetch(
      `https://api.uazapi.com.br/${instanceId}/contacts/${phone}/profile-picture`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.profilePicture || data.avatar_url || null;
    }
  } catch (error) {
    console.error('Erro ao buscar foto:', error);
  }
  return null;
}
```

**⚠️ IMPORTANTE:** Verificar a documentação do UAZAPI para o endpoint exato.

#### Passo 3: Salvar `avatar_url` ao Criar/Atualizar Contato

```javascript
async function findOrCreateContact(clinicId, contactData) {
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', contactData.phone)
    .maybeSingle();

  // Se existe, atualizar foto se necessário
  if (existing) {
    if (contactData.avatar_url && (!existing.avatar_url || existing.avatar_url !== contactData.avatar_url)) {
      await supabase
        .from('contacts')
        .update({ avatar_url: contactData.avatar_url })
        .eq('id', existing.id);
      existing.avatar_url = contactData.avatar_url;
    }
    return existing;
  }

  // Se não existe, criar com foto
  const { data: newContact } = await supabase
    .from('contacts')
    .insert({
      clinic_id: clinicId,
      phone: contactData.phone,
      name: contactData.name || contactData.phone,
      avatar_url: contactData.avatar_url || null,  // ⚠️ SALVAR FOTO
      channel_type: 'whatsapp',
      status: 'active'
    })
    .select()
    .single();

  return newContact;
}
```

#### Passo 4: Atualizar Foto quando Contato já Existe

Ao receber uma nova mensagem, se o contato já existe mas não tem foto (ou tem foto antiga), o backend deve:

1. Buscar foto atualizada do UAZAPI
2. Atualizar o contato no banco

```javascript
// Ao processar webhook de nova mensagem
const contact = await findOrCreateContact(clinicId, {
  phone: phone,
  name: senderName,
  avatar_url: profilePicture  // Incluir foto
});

// Se contato já existia mas não tinha foto, buscar agora
if (contact && !contact.avatar_url) {
  const updatedAvatar = await getProfilePicture(phone, instanceId, apiToken);
  if (updatedAvatar) {
    await supabase
      .from('contacts')
      .update({ avatar_url: updatedAvatar })
      .eq('id', contact.id);
  }
}
```

---

## 3. 📋 Checklist de Implementação no Backend

### Para Duplicação:
- [ ] Extrair `wa_message_id` do payload do UAZAPI
- [ ] Salvar `wa_message_id` em TODAS as mensagens
- [ ] Usar UPSERT ou verificar antes de inserir
- [ ] Ter índice único em `wa_message_id` no banco
- [ ] Testar com múltiplas mensagens para garantir não duplicação

### Para Fotos:
- [ ] Extrair `profilePicture` do payload do webhook
- [ ] Se não vier no webhook, buscar via API do UAZAPI
- [ ] Salvar `avatar_url` ao criar contato
- [ ] Atualizar `avatar_url` se contato já existe mas não tem foto
- [ ] Testar se fotos aparecem no sistema

---

## 4. 🔍 Como Verificar se Está Funcionando

### Verificar Duplicação:

**No Banco de Dados:**
```sql
-- Verificar se wa_message_id está sendo salvo
SELECT 
  COUNT(*) as total,
  COUNT(wa_message_id) as com_wa_id,
  COUNT(*) - COUNT(wa_message_id) as sem_wa_id
FROM messages
WHERE created_at > NOW() - INTERVAL '1 day';

-- Verificar duplicatas
SELECT wa_message_id, COUNT(*) as count
FROM messages
WHERE wa_message_id IS NOT NULL
GROUP BY wa_message_id
HAVING COUNT(*) > 1;
```

**Se `sem_wa_id > 0`:** Backend não está salvando `wa_message_id`  
**Se houver duplicatas:** Backend não está usando UPSERT corretamente

### Verificar Fotos:

**No Banco de Dados:**
```sql
-- Ver contatos sem foto
SELECT phone, name, avatar_url, created_at
FROM contacts
WHERE avatar_url IS NULL
ORDER BY created_at DESC;

-- Ver contatos com foto
SELECT phone, name, avatar_url
FROM contacts
WHERE avatar_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

---

## 5. 🛠️ Exemplo Completo de Processamento de Webhook

```javascript
async function processUAZAPIWebhook(payload) {
  try {
    // 1. Extrair dados básicos
    const event = payload.event || payload.type;
    const messageData = payload.data || payload.message || payload;
    
    // 2. Extrair wa_message_id (tentar múltiplas possibilidades)
    const waMessageId = messageData.id || 
                        messageData.messageId || 
                        messageData.wa_id ||
                        `${messageData.phone}_${messageData.timestamp}_${Date.now()}`; // Fallback
    
    // 3. Extrair foto de perfil
    const avatarUrl = messageData.sender?.profilePicture ||
                      messageData.profilePicture ||
                      messageData.sender?.avatar ||
                      null;
    
    // Se não tem foto, tentar buscar via API
    let finalAvatarUrl = avatarUrl;
    if (!finalAvatarUrl && messageData.phone) {
      finalAvatarUrl = await getProfilePicture(messageData.phone, instanceId, apiToken);
    }
    
    // 4. Criar/atualizar contato COM FOTO
    const contact = await findOrCreateContact(clinicId, {
      phone: messageData.phone || messageData.from,
      name: messageData.sender?.name || messageData.name || messageData.phone,
      avatar_url: finalAvatarUrl  // ⚠️ INCLUIR FOTO
    });
    
    // 5. Inserir mensagem COM wa_message_id (usando UPSERT)
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        wa_message_id: waMessageId,  // ⚠️ SEMPRE INCLUIR
        conversation_id: conversation.id,
        contact_id: contact.id,
        clinic_id: clinicId,
        content: messageData.text || messageData.content,
        sender_type: 'contact',
        direction: 'inbound',
        status: 'delivered'
      })
      .select()
      .single();
    
    // Se deu erro de duplicata (unique constraint), ignorar
    if (error && error.code !== '23505') {
      throw error;
    }
    
    return { success: true, messageId: message?.id };
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    throw error;
  }
}
```

---

## 6. 📚 Documentação do UAZAPI

**IMPORTANTE:** Verificar a documentação oficial do UAZAPI para:
- Estrutura exata do payload do webhook
- Como buscar foto de perfil via API
- Formato do `wa_message_id`
- Endpoints disponíveis

**Links úteis:**
- Documentação UAZAPI: https://uazapi.com.br/docs (verificar URL correta)
- Suporte UAZAPI: Para esclarecer estrutura do payload

---

**Última atualização:** Dezembro 2024  
**Status:** Aguardando implementação no backend

