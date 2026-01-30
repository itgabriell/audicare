# 🔧 Correções: Duplicação de Mensagens e Fotos de Contatos

## ✅ Correções Aplicadas no Frontend

### 1. Deduplicação de Mensagens Melhorada

**Problema identificado:**
- Verificação duplicada (código repetido)
- Cache sendo marcado muito cedo (antes de verificar estado local)
- Race conditions quando múltiplos eventos Realtime chegam simultaneamente

**Correções aplicadas:**
- ✅ Removida verificação duplicada
- ✅ Cache marcado APÓS verificar estado local e adicionar mensagem
- ✅ Logs melhorados para debug
- ✅ Verificação mais robusta usando `wa_message_id` como prioridade

**Arquivo modificado:**
- `src/hooks/useWhatsApp.js`

---

## ⚠️ O Que Precisa Ser Verificado/Corrigido no Backend

### 1. **Backend deve garantir `wa_message_id`**

O backend na VPS **DEVE** extrair e salvar o `wa_message_id` de cada mensagem recebida do UAZAPI.

**Por quê?**
- `wa_message_id` é o ID único que o UAZAPI/WhatsApp atribui a cada mensagem
- É a forma mais confiável de prevenir duplicatas
- O frontend usa isso como chave primária de deduplicação

**Como verificar no backend:**
```sql
-- Verificar se mensagens têm wa_message_id
SELECT 
  COUNT(*) as total_mensagens,
  COUNT(wa_message_id) as com_wa_id,
  COUNT(*) - COUNT(wa_message_id) as sem_wa_id
FROM messages
WHERE created_at > NOW() - INTERVAL '1 day';
```

**Se `sem_wa_id > 0`:**
O backend não está extraindo/salvando o `wa_message_id` corretamente do payload do UAZAPI.

**O que o backend deve fazer:**
```javascript
// Exemplo do que o backend deve fazer ao processar webhook do UAZAPI
const waMessageId = payload.message?.id || payload.id || payload.messageId;
// Salvar no banco:
INSERT INTO messages (..., wa_message_id) VALUES (..., waMessageId);
```

### 2. **Backend deve usar UPSERT para prevenir duplicatas**

O backend deve usar `INSERT ... ON CONFLICT` para garantir que mensagens com mesmo `wa_message_id` não sejam duplicadas:

```sql
INSERT INTO messages (wa_message_id, conversation_id, content, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (wa_message_id) DO NOTHING;
```

**OU** verificar antes de inserir:
```sql
-- Verificar se já existe
SELECT id FROM messages WHERE wa_message_id = $1;

-- Se não existe, inserir
-- Se existe, não fazer nada
```

### 3. **Backend deve buscar e salvar fotos de perfil**

**Problema:**
As fotos de contatos não aparecem porque o backend não está buscando/salvando o `avatar_url` dos contatos do UAZAPI.

**O que o backend precisa fazer:**

1. **Ao receber webhook do UAZAPI:**
   - Extrair informações do remetente (sender)
   - Buscar foto de perfil do UAZAPI (se disponível na API)
   - Salvar `avatar_url` no contato

2. **API UAZAPI para buscar foto:**
   - Verificar na documentação do UAZAPI como buscar foto de perfil
   - Geralmente é algo como: `GET /contacts/{phone}/profile-picture`
   - Ou o webhook já vem com `profilePicture` no payload

3. **Salvar no banco:**
   ```javascript
   // Ao criar/atualizar contato
   const avatarUrl = payload.sender?.profilePicture || 
                     payload.sender?.avatar || 
                     await fetchProfilePictureFromUAZAPI(phone);
   
   await upsertContact({
     phone: phone,
     name: name,
     avatar_url: avatarUrl, // ⚠️ IMPORTANTE
     ...
   });
   ```

---

## 🔍 Como Diagnosticar

### Verificar Duplicação

1. **No banco de dados:**
```sql
-- Ver mensagens duplicadas por wa_message_id
SELECT wa_message_id, COUNT(*) as count
FROM messages
WHERE wa_message_id IS NOT NULL
GROUP BY wa_message_id
HAVING COUNT(*) > 1;
```

2. **No console do navegador:**
```javascript
// Ver cache de mensagens processadas
import { whatsappService } from '@/services/whatsappService';
console.log(whatsappService.getCacheStats());
```

3. **Logs do sistema:**
- Abra o console do navegador (F12)
- Procure por logs: `[useWhatsApp] Mensagem já processada...`
- Se ver muitas mensagens sendo ignoradas, a deduplicação está funcionando

### Verificar Fotos de Contatos

1. **No banco de dados:**
```sql
-- Ver contatos sem foto
SELECT phone, name, avatar_url
FROM contacts
WHERE avatar_url IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

2. **Verificar se backend está recebendo foto do UAZAPI:**
- Ver logs do backend ao processar webhook
- Verificar se o payload do UAZAPI contém `profilePicture` ou similar
- Verificar se o backend está salvando no banco

---

## 📋 Checklist para Backend

### Duplicação:
- [ ] Backend está extraindo `wa_message_id` do payload do UAZAPI?
- [ ] Backend está salvando `wa_message_id` no banco?
- [ ] Backend usa UPSERT ou verifica antes de inserir?
- [ ] Índice único em `wa_message_id` está funcionando?

### Fotos:
- [ ] Backend busca foto de perfil do UAZAPI?
- [ ] Backend salva `avatar_url` ao criar/atualizar contato?
- [ ] Foto está sendo enviada no webhook do UAZAPI?
- [ ] Backend está atualizando foto quando contato já existe?

---

## 🛠️ Ações Recomendadas

### No Backend (VPS):

1. **Verificar logs do webhook:**
   - Ver o payload completo que o UAZAPI está enviando
   - Identificar onde está o `wa_message_id`
   - Identificar onde está a foto de perfil

2. **Corrigir processamento:**
   - Garantir que `wa_message_id` seja sempre salvo
   - Implementar UPSERT para prevenir duplicatas
   - Buscar e salvar `avatar_url` dos contatos

3. **Testar:**
   - Enviar mensagem de teste
   - Verificar se `wa_message_id` foi salvo
   - Verificar se foto apareceu

---

## 📝 Notas Técnicas

### Estrutura Esperada do Webhook UAZAPI:

```json
{
  "event": "on-message-received",
  "data": {
    "id": "WA_MESSAGE_ID_AQUI", // ⚠️ Este deve ser salvo como wa_message_id
    "from": "5511999999999",
    "text": "Mensagem",
    "sender": {
      "name": "Nome do Contato",
      "profilePicture": "https://..." // ⚠️ Esta URL deve ser salva como avatar_url
    }
  }
}
```

**IMPORTANTE:** A estrutura exata depende da versão/implementação do UAZAPI. Verifique a documentação do UAZAPI para o formato exato.

---

**Última atualização:** Dezembro 2024

