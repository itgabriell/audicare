# Chatwoot + Uazapi Integration (Adaptador Bidirecional)

Este adaptador permite a integração bidirecional entre o Chatwoot (interface de chat) e a Uazapi (gateway WhatsApp), criando uma ponte completa entre os dois serviços.

## 📋 Funcionalidades

### ✅ WhatsApp → Chatwoot (Entrada)
- Recebe mensagens do WhatsApp via Uazapi
- Cria contatos automaticamente no Chatwoot
- Cria conversas automaticamente
- Processa mensagens de texto e mídia
- Suporte a deduplicação de mensagens

### ✅ Chatwoot → WhatsApp (Saída)
- Recebe respostas dos atendentes no Chatwoot
- Envia mensagens automaticamente para o WhatsApp
- Ignora mensagens privadas (notas internas)
- Suporte completo a formatação de números brasileiros

## 🚀 Configuração

### 1. Variáveis de Ambiente (.env)

Adicione estas variáveis ao seu arquivo `.env`:

```env
# Chatwoot Configuration
CHATWOOT_API_URL=https://chat.seudominio.com.br
CHATWOOT_API_TOKEN=seu_token_aqui
CHATWOOT_INBOX_ID=id_da_caixa_de_entrada

# Uazapi Configuration
UAZAPI_URL=https://api.uazapi.com
UAZAPI_API_KEY=seu_token_uazapi

# Backend existente
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_KEY=sua_service_key
```

### 2. Obter Token do Chatwoot

1. Acesse seu Chatwoot em https://chat.seudominio.com.br
2. Vá em **Settings** → **API Keys**
3. Crie um novo token com permissões de leitura/escrita
4. Copie o token para `CHATWOOT_API_TOKEN`

### 3. Obter Inbox ID

1. No Chatwoot, vá em **Settings** → **Inboxes**
2. Clique na caixa de entrada API
3. O ID estará na URL ou configurações
4. Copie para `CHATWOOT_INBOX_ID`

### 4. Configurar Webhooks

#### Webhook no Chatwoot (para respostas dos atendentes):
- URL: `https://seu-backend.com/webhooks/chatwoot`
- Eventos: `message_created`

#### Webhook na Uazapi (para mensagens recebidas):
- URL: `https://seu-backend.com/webhooks/whatsapp`
- Método: POST

## 📡 Endpoints da API

### POST /webhooks/whatsapp
Recebe mensagens do WhatsApp via Uazapi e as envia para o Chatwoot.

**Exemplo de payload da Uazapi:**
```json
{
  "EventType": "messages",
  "message": {
    "phone": "5511999999999",
    "text": "Olá, gostaria de agendar uma consulta",
    "senderName": "João Silva",
    "fromMe": false
  }
}
```

### POST /webhooks/chatwoot
Recebe respostas do Chatwoot e as envia para o WhatsApp via Uazapi.

**Exemplo de payload do Chatwoot:**
```json
{
  "event": "message_created",
  "message_type": "outgoing",
  "message": {
    "content": "Olá! Claro, podemos agendar. Qual seria a melhor data?",
    "private": false
  },
  "contact": {
    "phone_number": "5511999999999",
    "name": "João Silva"
  }
}
```

### GET /webhooks/health
Endpoint de saúde para verificar se a integração está funcionando.

## 🔧 Como Funciona

### Fluxo WhatsApp → Chatwoot:
1. Cliente envia mensagem no WhatsApp
2. Uazapi recebe e envia webhook para `/webhooks/whatsapp`
3. Adaptador processa a mensagem
4. Busca/cria contato no Chatwoot
5. Busca/cria conversa no Chatwoot
6. Cria mensagem no Chatwoot
7. Atendente vê a mensagem na interface do Chatwoot

### Fluxo Chatwoot → WhatsApp:
1. Atendente responde na interface do Chatwoot
2. Chatwoot envia webhook para `/webhooks/chatwoot`
3. Adaptador verifica se é resposta pública (não privada)
4. Extrai número do telefone e conteúdo
5. Envia mensagem via Uazapi para o WhatsApp
6. Cliente recebe a resposta no WhatsApp

## 🛠️ Arquitetura dos Arquivos

```
backend/
├── services/
│   └── ChatwootService.js      # Serviço principal de integração
├── routes/
│   └── webhookRoutes.js        # Rotas dos webhooks
└── wa-bridge-index-corrected.js # Servidor principal (modificado)
```

## 📊 Monitoramento

### Logs Importantes:
- `[Chatwoot]` - Operações com Chatwoot API
- `[Uazapi]` - Operações com Uazapi
- `[Webhook]` - Processamento de webhooks

### Verificação de Saúde:
```bash
curl https://seu-backend.com/webhooks/health
```

## 🚨 Troubleshooting

### Problema: Mensagens não chegam no Chatwoot
**Soluções:**
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme se o webhook da Uazapi está configurado corretamente
3. Verifique os logs do backend para erros

### Problema: Respostas não chegam no WhatsApp
**Soluções:**
1. Verifique se o webhook do Chatwoot está configurado
2. Confirme se o token da Uazapi está válido
3. Verifique se a mensagem não é privada (private: true)

### Problema: Contatos duplicados
**Solução:**
- O adaptador já tem lógica para buscar contatos existentes
- Verifique se os números de telefone estão sendo formatados corretamente

## 🔒 Segurança

- Todas as comunicações usam HTTPS
- Tokens de API são armazenados em variáveis de ambiente
- O serviço valida payloads antes de processar
- Logs não incluem dados sensíveis

## 📝 Notas de Desenvolvimento

- O adaptador é stateless e pode ser escalado horizontalmente
- Suporte completo a mensagens de mídia (imagens, áudio, documentos)
- Processamento automático de avatares de perfil
- Associação automática com pacientes existentes (se aplicável)

## 🎯 Próximos Passos

1. Configurar webhooks nos dois serviços
2. Testar o fluxo completo
3. Monitorar logs em produção
4. Configurar alertas para falhas
5. Documentar para a equipe de suporte
