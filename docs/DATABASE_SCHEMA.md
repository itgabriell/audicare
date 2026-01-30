# Esquema do Banco de Dados - Módulo de Mensagens

Este documento descreve a estrutura das tabelas principais usadas no sistema de Caixa de Entrada.

### 1. `contacts`

Armazena informações sobre cada contato individual. Um contato é único por `clinic_id` e `phone`.

**Colunas Principais:**
- `id` (uuid, PK): Identificador único do contato.
- `clinic_id` (uuid, FK): Vincula o contato a uma clínica.
- `phone` (text): Número de telefone do contato (formato internacional, ex: 5511999998888).
- `name` (text): Nome do contato.
- `email` (text): E-mail do contato (opcional).
- `avatar_url` (text): URL para a foto de perfil do contato.
- `status` (enum `contact_status`): Status do contato ('active', 'archived', 'blocked').

### 2. `conversations`

Representa uma conversa (ou "chat") entre a clínica e um contato.

**Colunas Principais:**
- `id` (uuid, PK): Identificador único da conversa.
- `clinic_id` (uuid, FK): Vincula a conversa a uma clínica.
- `contact_id` (uuid, FK): Vincula a conversa a um contato.
- `last_message_at` (timestamptz): Timestamp da última mensagem, usado para ordenação.
- `unread_count` (integer): Contador de mensagens não lidas pelo atendente.
- `status` (enum `conversation_status`): Status da conversa ('open', 'resolved', 'pending', 'snoozed').

### 3. `messages`

Armazena cada mensagem individual trocada em uma conversa.

**Colunas Principais:**
- `id` (uuid, PK): Identificador único da mensagem.
- `conversation_id` (uuid, FK): Vincula a mensagem a uma conversa.
- `contact_id` (uuid, FK): Vincula a mensagem a um contato.
- `clinic_id` (uuid, FK): Vincula a mensagem a uma clínica (para políticas de segurança).
- `sender_type` (enum `sender_type`): Quem enviou a mensagem ('user', 'contact', 'system').
- `content` (text): O conteúdo textual da mensagem.
- `media_url` (text): URL para mídias anexadas.
- `status` (enum `message_status`): Status de entrega da mensagem ('sending', 'sent', 'delivered', 'read', 'failed').

### 4. `conversation_tags`

Tabela de associação para aplicar tags a conversas, permitindo categorização.

**Colunas Principais:**
- `conversation_id` (uuid, FK): ID da conversa.
- `tag_name` (text): O nome da tag (ex: "orçamento", "suporte").

### 5. `contact_relationships`

Tabela crucial para conectar um `contact` a outras entidades do sistema. Veja `CONTACT_RELATIONSHIPS.md` para mais detalhes.

**Colunas Principais:**
- `contact_id` (uuid, FK): ID do contato.
- `related_entity_type` (enum `related_entity`): O tipo da entidade relacionada ('patient', 'lead', 'repair').
- `related_entity_id` (uuid): O ID da entidade relacionada (ex: `patients.id`).