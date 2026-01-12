# Checklist de Validação da Integração Supabase

Este documento fornece um checklist completo para validar a configuração do banco de dados, a API e a integração em tempo real com o Supabase. Siga estes passos após executar as migrações e configurar o ambiente.

## 1. Validação da Estrutura do Banco de Dados

### 1.1. Validar Migrações Executadas
- **Como Validar:** Verifique se a execução de cada script de migração (`001` a `004`) no SQL Editor resultou em "Success".
- **Checklist:**
    - [ ] Migração `001_create_multichannel_tables.sql` executada com sucesso.
    - [ ] Migração `002_create_rls_policies.sql` executada com sucesso.
    - [ ] Migração `003_create_indexes.sql` executada com sucesso.
    - [ ] Migração `004_create_triggers.sql` executada com sucesso.

### 1.2. Validar Tabelas Criadas
- **Como Validar:** No painel do Supabase, vá para **Table Editor** e verifique se as tabelas existem no schema `public`.
- **Checklist:**
    - [ ] Tabela `channels` existe.
    - [ ] Tabela `contacts` existe.
    - [ ] Tabela `conversations` existe.
    - [ ] Tabela `messages` existe.
    - [ ] Tabela `contact_patients` existe.
    - [ ] Tabela `message_templates` existe.
    - [ ] Tabela `campaigns` existe.
    - [ ] Tabela `campaign_recipients` existe.

### 1.3. Validar Políticas de RLS (Row Level Security)
- **Como Validar:** Vá para **Authentication -> Policies**. Encontre cada uma das tabelas listadas abaixo e verifique se a política "Members can manage..." (ou similar) está ativa.
- **Checklist:**
    - [ ] RLS ativa para `channels`.
    - [ ] RLS ativa para `contacts`.
    - [ ] RLS ativa para `conversations`.
    - [ ] RLS ativa para `messages`.
    - [ ] RLS ativa para `message_templates`.
    - [ ] ... (e para as outras tabelas relevantes).

### 1.4. Validar Índices
- **Como Validar:** Use o SQL Editor para executar uma query que lista os índices de uma tabela.