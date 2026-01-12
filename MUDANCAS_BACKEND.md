# 📝 Mudanças Aplicadas no Backend

## 🔧 Correções Implementadas

### 1. **Deduplicação de Mensagens** ✅

#### Problema:
- Backend estava usando `wa_id` mas o banco usa `wa_message_id`
- Não estava usando UPSERT, apenas verificação simples
- Race conditions podiam causar duplicatas

#### Correção:
- ✅ Alterado `wa_id` para `wa_message_id` em todas as verificações e inserções
- ✅ Implementado UPSERT com `onConflict: 'wa_message_id'`
- ✅ Fallback para INSERT com verificação se UPSERT não funcionar
- ✅ Melhor logging para debug

**Código alterado:**
```javascript
// ANTES:
.eq('wa_id', waMessageId)
wa_id: waMessageId

// DEPOIS:
.eq('wa_message_id', waMessageId)
wa_message_id: waMessageId
```

### 2. **Fotos de Contatos** ✅

#### Problema:
- Foto não estava sendo extraída corretamente do payload
- Foto não era atualizada quando contato já existia
- Busca em poucos locais do payload

#### Correção:
- ✅ Busca de foto em **múltiplos locais** do payload do UAZAPI
- ✅ **Atualização automática** de foto quando contato já existe mas não tem foto (ou tem foto diferente)
- ✅ Atualização de nome se mudou
- ✅ Logs melhorados para identificar quando foto é encontrada/atualizada

**Locais onde busca foto:**
```javascript
msgNode.senderPhoto || 
msgNode.profilePicture ||
msgNode.avatar ||
chatData.imagePreview || 
chatData.image ||
chatData.pic ||
chatData.profilePicture ||
body.sender?.profilePicture ||
body.sender?.avatar ||
null
```

**Lógica de atualização:**
- Se contato já existe mas não tem foto → Atualiza
- Se contato já existe mas foto é diferente → Atualiza
- Se contato não existe → Cria com foto

### 3. **Compatibilidade de Schema** ✅

#### Problema:
- Backend usava `channel` mas schema pode usar `channel_type`
- Causava erros ao criar contatos/conversas

#### Correção:
- ✅ Tenta usar `channel_type` primeiro (padrão do schema)
- ✅ Se erro, tenta com `channel` (fallback)
- ✅ Trata erros graciosamente

**Lógica:**
```javascript
// Tenta com channel_type
contactData.channel_type = 'whatsapp';
// Se erro 42703 (coluna não existe), tenta com channel
```

### 4. **Melhorias Gerais** ✅

- ✅ Logs mais detalhados para debug
- ✅ Tratamento de erros mais robusto
- ✅ Validações melhoradas
- ✅ Extração de nome de contato melhorada (múltiplas fontes)

---

## 📋 Checklist de Verificação

Após substituir o código na VPS, verifique:

### 1. Duplicação:
- [ ] Enviar mensagem de teste
- [ ] Verificar no banco se não duplicou
- [ ] Verificar se `wa_message_id` está sendo salvo
- [ ] Verificar logs do backend

**SQL para verificar:**
```sql
-- Ver se wa_message_id está sendo salvo
SELECT 
  COUNT(*) as total,
  COUNT(wa_message_id) as com_wa_id,
  COUNT(*) - COUNT(wa_message_id) as sem_wa_id
FROM messages
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verificar duplicatas
SELECT wa_message_id, COUNT(*) as count
FROM messages
WHERE wa_message_id IS NOT NULL
GROUP BY wa_message_id
HAVING COUNT(*) > 1;
```

### 2. Fotos:
- [ ] Enviar mensagem de um contato com foto
- [ ] Verificar se foto apareceu no sistema
- [ ] Verificar no banco se `avatar_url` foi salvo

**SQL para verificar:**
```sql
-- Ver contatos com foto recentes
SELECT phone, name, avatar_url, updated_at
FROM contacts
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

### 3. Logs:
- [ ] Verificar logs do backend ao receber mensagem
- [ ] Verificar se aparecem logs de foto (📸)
- [ ] Verificar se aparecem logs de duplicação (🔁)

---

## 🚀 Como Aplicar

1. **Substituir arquivo:**
   - Copiar conteúdo de `backend-wa-bridge-index-corrected.js`
   - Substituir em `backend-wa-bridge/index.js` na VPS

2. **Reiniciar serviço:**
   ```bash
   # Se usar PM2
   pm2 restart backend-wa-bridge
   
   # Ou se usar systemd
   sudo systemctl restart backend-wa-bridge
   
   # Ou manualmente
   node index.js
   ```

3. **Verificar logs:**
   ```bash
   # Ver logs em tempo real
   pm2 logs backend-wa-bridge
   # ou
   tail -f /var/log/backend-wa-bridge.log
   ```

4. **Testar:**
   - Enviar mensagem de teste do WhatsApp
   - Verificar logs
   - Verificar no banco de dados

---

## ⚠️ Notas Importantes

1. **wa_message_id**: O código agora usa `wa_message_id` corretamente. Se o banco ainda tiver a coluna `wa_id`, pode ser necessário uma migração.

2. **UPSERT**: Se o banco não tiver o índice único em `wa_message_id`, o UPSERT pode falhar. Nesse caso, o código tem fallback para INSERT com verificação.

3. **Fotos**: A extração de fotos depende do formato do payload do UAZAPI. Se ainda não funcionar, pode ser necessário verificar o payload real e adicionar mais locais de busca.

4. **Schema**: O código tenta ser compatível com ambos `channel` e `channel_type`. Se ainda der erro, verificar o schema real da tabela.

---

**Última atualização:** Dezembro 2024

