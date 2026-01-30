# Estrutura Atual do Banco de Dados Supabase (Pós-Normalização)

**Data da Auditoria:** 17 de Novembro de 2025

Este documento detalha a estrutura do banco de dados após a normalização e limpeza. Ele representa o estado real das tabelas principais do sistema.

## 1. Tabela `clinics`

Armazena as informações de cada clínica (tenant) no sistema.

| Nome da Coluna | Tipo de Dado | Chave Estrangeira |
| --- | --- | --- |
| `id` | `uuid` | - |
| `name` | `text` | - |
| `owner_id` | `uuid` | - |
| `created_at` | `timestamp with time zone` | - |
| ... | ... | ... |

## 2. Tabela `patients`

Armazena os registros dos pacientes da clínica.

| Nome da Coluna | Tipo de Dado | Chave Estrangeira |
| --- | --- | --- |
| `id` | `uuid` | - |
| `clinic_id` | `uuid` | `public.clinics(id)` |
| `name` | `text` | - |
| `phone` | `text` | - |
| `notes` | `text` | *(Nullable)* |
| `created_at` | `timestamp with time zone` | - |

## 3. Tabela `contacts`

Armazena informações de contatos externos para o módulo de atendimento.

| Nome da Coluna | Tipo de Dado | Chave Estrangeira |
| --- | --- | --- |
| `id` | `uuid` | - |
| `clinic_id` | `uuid` | `public.clinics(id)` |
| `phone` | `text` | - |
| `name` | `text` | - |
| `notes` | `text` | *(Nullable) General observations* |
| `created_at` | `timestamp with time zone` | - |
| `updated_at` | `timestamp with time zone` | - |

## 4. Tabela `conversations`

Agrupa mensagens de um contato específico, formando uma conversa.

| Nome da Coluna | Tipo de Dado | Chave Estrangeira |
| --- | --- | --- |
| `id` | `uuid` | - |
| `clinic_id` | `uuid` | `public.clinics(id)` |
| `contact_id` | `uuid` | `public.contacts(id)` |
| `status` | `USER-DEFINED` | - |
| `last_message_at`| `timestamp with time zone` | - |
| `created_at` | `timestamp with time zone` | - |

## 5. Tabela `messages`

Armazena cada mensagem individual de uma conversa.

| Nome da Coluna | Tipo de Dado | Chave Estrangeira |
| --- | --- | --- |
| `id` | `uuid` | - |
| `conversation_id`| `uuid` | `public.conversations(id)` |
| `sender_type` | `USER-DEFINED` | - |
| `content` | `text` | - |
| `created_at` | `timestamp with time zone` | - |

## 6. Tabela `appointments`

Armazena os agendamentos dos pacientes.

| Nome da Coluna | Tipo de Dado | Chave Estrangeira |
| --- | --- | --- |
| `id` | `uuid` | - |
| `patient_id` | `uuid` | `public.patients(id)` |
| `clinic_id` | `uuid` | `public.clinics(id)` |
| `professional_id`| `uuid` | `public.profiles(id)` |
| `professional_name`| `text` | `Default: 'Dra. Karine Brandão'` |
| `appointment_date`| `timestamp with time zone` | - |
| `appointment_type`| `text` | `Default: 'Retorno comum'` |
| `status` | `USER-DEFINED` | - |
| `notes` | `text` | *(Nullable) Consultation-specific notes* |
| `scheduled_at` | `timestamp with time zone` | - |
| `created_at` | `timestamp with time zone` | - |
| `updated_at` | `timestamp with time zone` | - |