# Integração Chatwoot - Documentação da API

## Visão Geral

Este documento descreve a integração completa entre o sistema Audicare e o Chatwoot, permitindo sincronização bidirecional de dados de pacientes e contatos.

## Arquitetura da Integração

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Aplicação     │    │    Backend      │    │    Chatwoot     │
│   Audicare      │◄──►│   (VPS)        │◄──►│                 │
│                 │    │                 │    │                 │
│ • Pacientes     │    │ • API Rest      │    │ • Contatos      │
│ • Agendamentos  │    │ • Webhooks      │    │ • Conversas     │
│ • Telefones     │    │ • Sincronização │    │ • Mensagens     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                          ▲
                          │
                   ┌─────────────────┐
                   │   Supabase      │
                   │                 │
                   │ • Triggers DB   │
                   │ • Webhooks      │
                   │ • Row Level     │
                   │   Security      │
                   └─────────────────┘
```

## Endpoints da API

### 1. Consulta de Pacientes

#### GET /api/patients/search-by-phone
Busca paciente por número de telefone para integração com Chatwoot.

**Parâmetros de Query:**
- `phone` (string, obrigatório): Número do telefone (apenas dígitos)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "patient": {
    "id": 123,
    "name": "João Silva",
    "primary_phone": "11999999999",
    "whatsapp_phone": "11999999999",
    "email": "joao@email.com",
    "birth_date": "1990-01-15",
    "phones": [
      {
        "phone": "11999999999",
        "is_primary": true,
        "is_whatsapp": true
      }
    ],
    "addresses": [
      {
        "street": "Rua das Flores",
        "number": "123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP"
      }
    ],
    "tags": [
      {
        "name": "VIP",
        "color": "#FF0000"
      }
    ]
  }
}
```

**Resposta quando não encontra (200):**
```json
{
  "success": false,
  "message": "Patient not found",
  "patient": null
}
```

### 2. Detalhes do Paciente

#### GET /api/patients/:id/contacts
Busca dados completos de contato de um paciente específico.

**Parâmetros de URL:**
- `id` (integer): ID do paciente

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "contact": {
    "id": 123,
    "name": "João Silva",
    "primary_phone": "11999999999",
    "email": "joao@email.com",
    "birth_date": "1990-01-15",
    "phones": [...],
    "addresses": [...],
    "whatsapp_phone": "11999999999"
  }
}
```

## Webhooks do Supabase

### 1. Mudanças em Pacientes

**Endpoint:** `POST /webhooks/supabase/patient-changes`

**Payload Recebido:**
```json
{
  "event_type": "INSERT|UPDATE|DELETE",
  "patient_id": 123,
  "patient_data": { /* dados completos do paciente */ },
  "changed_fields": { /* apenas para UPDATE */ },
  "timestamp": 1640995200.123
}
```

**Ação:** Sincroniza dados do paciente com contato no Chatwoot.

### 2. Mudanças em Telefones

**Endpoint:** `POST /webhooks/supabase/patient-phone-changes`

**Payload Recebido:**
```json
{
  "event_type": "INSERT|UPDATE|DELETE",
  "phone_id": 456,
  "patient_id": 123,
  "phone_data": {
    "phone": "11999999999",
    "is_primary": true,
    "is_whatsapp": true
  },
  "timestamp": 1640995200.123
}
```

**Ação:** Sincroniza telefone WhatsApp com Chatwoot.

### 3. Mudanças em Endereços

**Endpoint:** `POST /webhooks/supabase/patient-address-changes`

**Payload Recebido:**
```json
{
  "event_type": "INSERT|UPDATE|DELETE",
  "address_id": 789,
  "patient_id": 123,
  "address_data": { /* dados do endereço */ },
  "timestamp": 1640995200.123
}
```

**Ação:** Log de mudanças (atualização futura de atributos no Chatwoot).

## Configuração no Supabase

### 1. Aplicar Migração

Execute a migração `036_create_chatwoot_sync_triggers.sql` no Supabase:

```sql
-- Isso criará:
-- • Triggers para pacientes, telefones e endereços
-- • Tabela de log de sincronização
-- • Função RPC find_patient_by_phone
-- • Políticas RLS
```

### 2. Configurar Webhooks no Supabase

No painel do Supabase, configure webhooks para os seguintes eventos:

#### Webhook para Mudanças em Pacientes
- **URL:** `https://sua-vps.com/webhooks/supabase/patient-changes`
- **Eventos:** `INSERT`, `UPDATE`, `DELETE`
- **Tabela:** `patients`

#### Webhook para Mudanças em Telefones
- **URL:** `https://sua-vps.com/webhooks/supabase/patient-phone-changes`
- **Eventos:** `INSERT`, `UPDATE`, `DELETE`
- **Tabela:** `patient_phones`

#### Webhook para Mudanças em Endereços
- **URL:** `https://sua-vps.com/webhooks/supabase/patient-address-changes`
- **Eventos:** `INSERT`, `UPDATE`, `DELETE`
- **Tabela:** `patient_addresses`

## Configuração no Chatwoot

### 1. Webhooks no Chatwoot

Configure os seguintes webhooks no painel do Chatwoot:

#### Webhook para Mensagens Enviadas
- **URL:** `https://sua-vps.com/webhooks/chatwoot`
- **Eventos:** `message_created`
- **Condições:** `message_type: outgoing`

### 2. Configuração da API

Certifique-se de que as seguintes variáveis estão configuradas no backend:

```env
# Chatwoot API
CHATWOOT_API_URL=https://chat.audicarefono.com.br
CHATWOOT_API_TOKEN=KDBiZy6KSHN7eq2rCkGY6L14
CHATWOOT_INBOX_ID=1

# Audicare Backend API
AUDICARE_API_URL=http://localhost:4000

# Uazapi
UAZAPI_URL=https://audicare.uazapi.com
UAZAPI_API_KEY=c1bd63dc-e1c4-4956-bd0b-e277bb59dc38
```

## Fluxo de Sincronização

### 1. Quando uma Mensagem Chega do WhatsApp

```
WhatsApp → Uazapi → Backend VPS → Chatwoot
     ↓
  Busca paciente por telefone
     ↓
  Sincroniza dados do paciente → Contato Chatwoot
     ↓
  Cria/atualiza conversa no Chatwoot
```

### 2. Quando um Paciente é Atualizado

```
Aplicação Audicare → Supabase Trigger → Webhook → Backend VPS → Chatwoot
     ↓
  Busca contato existente ou cria novo
     ↓
  Atualiza dados do contato no Chatwoot
```

### 3. Quando uma Resposta é Enviada no Chatwoot

```
Chatwoot → Webhook → Backend VPS → Uazapi → WhatsApp
```

## Monitoramento e Logs

### Tabela de Logs de Sincronização

```sql
SELECT * FROM chatwoot_sync_log
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Verificar Status dos Webhooks

```bash
# Health check dos webhooks
curl https://sua-vps.com/webhooks/supabase/health
curl https://sua-vps.com/webhooks/health

# Teste de API
curl "https://sua-vps.com/api/patients/search-by-phone?phone=11999999999"
```

## Troubleshooting

### Problemas Comuns

1. **Paciente não encontrado na API**
   - Verificar se o telefone está cadastrado na tabela `patient_phones`
   - Verificar se o telefone está marcado como `is_whatsapp: true`

2. **Contato não criado no Chatwoot**
   - Verificar credenciais da API do Chatwoot
   - Verificar se o inbox_id está correto

3. **Webhook não está funcionando**
   - Verificar se a URL está acessível publicamente
   - Verificar logs do backend VPS
   - Verificar configuração no Supabase

### Logs Úteis

```bash
# Ver logs do backend
tail -f /var/log/audicare/backend.log

# Ver logs de sincronização recentes
SELECT * FROM chatwoot_sync_log
WHERE sync_status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## Próximos Passos

1. **Sincronização Inicial**: Criar script para sincronizar todos os pacientes existentes
2. **Atributos Customizados**: Expandir sincronização para incluir mais dados no Chatwoot
3. **Dashboard de Monitoramento**: Interface para acompanhar status da sincronização
4. **Retry Mechanism**: Sistema de retentativa para sincronizações que falharam
