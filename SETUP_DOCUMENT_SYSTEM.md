# Setup do Sistema de Documentos - Passo a Passo

## ✅ Passos Já Concluídos

1. ✅ Migração SQL executada (`025_create_document_management.sql`)
2. ✅ Bucket `documents` criado no Supabase Storage

## 📋 Próximos Passos

### 1. Criar Tabela clinical_consultations (se ainda não existir)

Execute a migração `026_create_clinical_consultations.sql` no SQL Editor do Supabase:

```sql
-- Execute o arquivo migrations/026_create_clinical_consultations.sql
```

Esta tabela é necessária para vincular documentos às consultas.

**Nota:** Se a tabela `clinical_consultations` já existir no seu banco, você pode pular este passo.

### 2. Adicionar Foreign Key (Opcional)

Se você criou a tabela `clinical_consultations` na etapa anterior, execute também:

```sql
-- Execute o arquivo migrations/027_add_consultation_foreign_key.sql
```

Isso adiciona a constraint de foreign key entre `documents` e `clinical_consultations`.

### 3. Configurar Políticas do Storage Bucket

No Supabase Dashboard, vá em **Storage > Policies** e configure:

**Política de Upload (INSERT):**
```sql
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);
```

**Política de Leitura (SELECT):**
```sql
CREATE POLICY "Users can view documents from their clinic"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);
```

**Política de Exclusão (DELETE):**
```sql
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);
```

### 4. Testar o Sistema

1. **Criar um Template:**
   - Acesse **Configurações > Templates de Documentos**
   - Clique em **Novo Template**
   - Crie um template de teste (ex: "Receita Simples")
   - Adicione alguns campos

2. **Configurar Mensagem Padrão:**
   - Acesse **Configurações > Mensagens de Documentos**
   - Configure a mensagem para o tipo de documento criado

3. **Gerar um Documento:**
   - Vá para uma consulta de paciente
   - Aba **Documentos**
   - Clique em **Gerar Documento**
   - Selecione o template e preencha os campos
   - Gere e teste o download

## 🔍 Verificações

### Verificar se as tabelas foram criadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_templates', 'documents', 'document_messages', 'clinical_consultations');
```

### Verificar se o bucket existe:

No Supabase Dashboard:
- Storage > Verificar se o bucket `documents` está listado

### Verificar políticas RLS:

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('document_templates', 'documents', 'document_messages');
```

## ⚠️ Troubleshooting

### Erro: "relation does not exist"
- Execute a migração `026_create_clinical_consultations.sql`

### Erro ao fazer upload de PDF
- Verifique as políticas do bucket `documents`
- Confirme que o bucket está criado

### Documentos não aparecem
- Verifique se os documentos foram salvos na tabela `documents`
- Confirme que o `patient_id` está correto

### Template não aparece na lista
- Verifique se `is_active = true` no template
- Confirme que o `clinic_id` está correto

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase
3. Confirme que todas as migrações foram executadas

