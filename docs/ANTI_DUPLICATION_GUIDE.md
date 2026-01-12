# Guia de Prevenção de Duplicação de Mensagens

Este documento descreve as melhorias implementadas para prevenir duplicação de mensagens no sistema.

## Problema Identificado

Mensagens recebidas do WhatsApp estavam sendo duplicadas na interface, mesmo após várias correções. Isso ocorria por:

1. **Falta de constraint única no banco**: Não havia garantia de unicidade por `wa_message_id`
2. **Cache não persistente**: O cache de mensagens processadas era perdido ao recarregar a página
3. **Deduplicação insuficiente**: A lógica de deduplicação não considerava todos os cenários
4. **Race conditions**: Múltiplos eventos Realtime podiam processar a mesma mensagem

## Soluções Implementadas

### 1. Migration de Banco de Dados (`011_prevent_duplicate_messages.sql`)

**O que faz:**
- Adiciona coluna `wa_message_id` se não existir
- Cria índice único parcial em `wa_message_id` (permite NULL, mas garante unicidade quando presente)
- Cria índice composto para deduplicação por conteúdo + timestamp + conversation

**Como executar:**
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: migrations/011_prevent_duplicate_messages.sql
```

**Benefícios:**
- Previne duplicatas no nível do banco de dados
- Melhora performance de queries de deduplicação
- Garante integridade dos dados

### 2. Cache Persistente (`whatsappService.js`)

**O que faz:**
- Usa `localStorage` para persistir cache de mensagens processadas
- Cache sobrevive a recarregamentos da página
- TTL aumentado para 30 minutos
- Limpeza automática de entradas antigas

**Benefícios:**
- Mensagens não são reprocessadas após recarregar a página
- Cache persiste entre sessões
- Reduz carga no sistema

### 3. Deduplicação Robusta (`useWhatsApp.js`)

**Melhorias:**
- Deduplicação por múltiplos critérios (prioridade):
  1. ID do banco de dados
  2. `wa_message_id` (ID do WhatsApp)
  3. Conteúdo + timestamp + conversation_id
- Verificação prévia antes de processar eventos Realtime
- Janela de tempo aumentada para 3 segundos (antes era 2)
- Considera `conversation_id` na deduplicação por conteúdo

**Benefícios:**
- Captura duplicatas mesmo quando `wa_message_id` não está disponível
- Previne race conditions
- Mais preciso na detecção de duplicatas

### 4. Marcação de Mensagens Carregadas

**O que faz:**
- Ao carregar mensagens do banco, marca todas como processadas
- Previne que mensagens já carregadas sejam adicionadas novamente via Realtime

**Benefícios:**
- Evita duplicação ao abrir conversas
- Sincronização mais confiável

## Como Funciona o Fluxo Completo

### Recebimento de Mensagem (Backend → Frontend)

1. **Backend recebe mensagem do WhatsApp** (via Uazapi)
2. **Backend insere no banco** com `wa_message_id`
   - Se `wa_message_id` já existe, o índice único previne duplicata
3. **Supabase Realtime dispara evento** `INSERT` na tabela `messages`
4. **Frontend recebe evento** no hook `useWhatsApp`
5. **Verificação prévia:**
   - Se `wa_message_id` está no cache → **IGNORA**
   - Se `db_id` está no cache → **IGNORA**
6. **Verificação no estado local:**
   - Se existe por `wa_message_id` → **IGNORA**
   - Se existe por `db_id` → **IGNORA**
   - Se existe por conteúdo+timestamp → **IGNORA**
7. **Se passou todas as verificações:**
   - Marca como processada no cache
   - Adiciona ao estado
   - Notifica usuário

### Carregamento Inicial de Conversa

1. **Usuário abre conversa**
2. **Carrega mensagens do banco**
3. **Deduplica mensagens carregadas**
4. **Marca todas como processadas no cache**
5. **Exibe mensagens deduplicadas**

## Garantia de Recebimento (Sistema Fechado)

**Importante:** As mensagens continuam sendo recebidas mesmo quando o sistema está fechado porque:

1. **Backend independente**: O backend (VPS) recebe mensagens do WhatsApp continuamente
2. **Webhook/Edge Function**: Insere mensagens no banco Supabase
3. **Banco de dados**: Armazena todas as mensagens
4. **Ao reabrir**: Frontend carrega todas as mensagens do banco

**Não há perda de mensagens** porque o fluxo não depende do frontend estar aberto.

## Verificação e Debug

### Verificar Cache de Mensagens Processadas

```javascript
import { whatsappService } from '@/services/whatsappService';

// Ver estatísticas
console.log(whatsappService.getCacheStats());

// Limpar cache (útil para debug)
whatsappService.clearProcessedCache();
```

### Logs de Deduplicação

O sistema registra no console quando ignora mensagens duplicadas:
- `[useWhatsApp] Mensagem já processada (wa_id), ignorando: ...`
- `[useWhatsApp] Mensagem já existe por wa_id, ignorando: ...`
- `[useWhatsApp] Mensagem duplicada por conteúdo+timestamp, ignorando`

## Próximos Passos (Backend)

Para garantir 100% de prevenção de duplicatas, o backend deve:

1. **Usar UPSERT ao inserir mensagens:**
   ```sql
   INSERT INTO messages (...)
   VALUES (...)
   ON CONFLICT (wa_message_id) DO NOTHING;
   ```

2. **Verificar antes de inserir:**
   ```sql
   SELECT id FROM messages WHERE wa_message_id = $1;
   -- Se existe, não inserir
   ```

3. **Garantir que wa_message_id seja sempre preenchido** quando disponível

## Conclusão

Com essas melhorias, o sistema agora tem:
- ✅ Prevenção no banco de dados (índice único)
- ✅ Cache persistente (localStorage)
- ✅ Deduplicação robusta (múltiplos critérios)
- ✅ Verificação prévia (evita processamento desnecessário)
- ✅ Garantia de recebimento (independente do frontend)

As mensagens não devem mais duplicar, e todas serão recebidas mesmo quando o sistema estiver fechado.

