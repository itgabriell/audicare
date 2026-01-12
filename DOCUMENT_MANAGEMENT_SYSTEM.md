# Sistema de Gestão de Documentos - Documentação

## Visão Geral

Sistema completo de gestão de documentos médicos que permite criar templates personalizados, gerar documentos durante consultas, armazenar documentos no cadastro do paciente e enviar automaticamente por WhatsApp e Email.

## Funcionalidades Implementadas

### 1. Templates de Documentos
- ✅ Criação e edição de templates personalizados
- ✅ Suporte a diferentes tipos de documentos (Receita, Atestado, Relatório, Nota Fiscal, etc.)
- ✅ Campos dinâmicos com auto-preenchimento de dados do paciente
- ✅ Marca d'água configurável
- ✅ Assinatura digital com posicionamento customizável
- ✅ Cabeçalho e rodapé personalizáveis

### 2. Geração de Documentos
- ✅ Geração de PDFs durante consultas
- ✅ Preenchimento automático com dados do paciente
- ✅ Interface intuitiva para preenchimento de campos
- ✅ Download imediato do PDF gerado
- ✅ Armazenamento automático no cadastro do paciente

### 3. Armazenamento e Histórico
- ✅ Documentos salvos no Supabase Storage
- ✅ Registro completo no banco de dados
- ✅ Histórico de documentos por paciente
- ✅ Informações de quem emitiu o documento
- ✅ Data e hora de emissão

### 4. Envio Automático
- ✅ Envio por WhatsApp com mensagem personalizada
- ✅ Envio por Email (estrutura preparada)
- ✅ Mensagens padrão configuráveis por tipo de documento
- ✅ Placeholders para personalização ({{title}}, {{date}}, etc.)

### 5. Interface de Configuração
- ✅ Gerenciamento de templates em Configurações
- ✅ Configuração de mensagens padrão por tipo de documento
- ✅ Integração na página de atendimento (PatientCare)

## Estrutura do Banco de Dados

### Tabelas Criadas

1. **document_templates**
   - Armazena templates de documentos
   - Suporta marca d'água e assinatura
   - Campos JSONB para flexibilidade

2. **documents**
   - Documentos emitidos
   - Vinculados a pacientes e consultas
   - URLs de PDFs no storage
   - Metadados completos

3. **document_messages**
   - Mensagens padrão por tipo de documento
   - Suporte a WhatsApp e Email
   - Placeholders para personalização

## Arquivos Criados

### Migrações
- `migrations/025_create_document_management.sql` - Estrutura completa do banco

### Serviços
- `src/services/documentService.js` - Gerenciamento de documentos e geração de PDFs
- `src/services/documentSenderService.js` - Envio de documentos por WhatsApp/Email

### Componentes
- `src/components/documents/DocumentGenerator.jsx` - Interface para gerar documentos
- `src/components/documents/DocumentList.jsx` - Lista de documentos do paciente
- `src/components/documents/DocumentTemplateManager.jsx` - Gerenciamento de templates
- `src/components/settings/DocumentMessagesSettings.jsx` - Configuração de mensagens

### Integrações
- Integrado na página `PatientCare` para geração durante consultas
- Rotas adicionadas em `Settings` para configuração

## Como Usar

### 1. Configurar Templates

1. Acesse **Configurações > Templates de Documentos**
2. Clique em **Novo Template**
3. Preencha:
   - Nome do template
   - Tipo de documento
   - Campos do documento (com opção de auto-preenchimento)
   - Configurações de marca d'água e assinatura

### 2. Configurar Mensagens Padrão

1. Acesse **Configurações > Mensagens de Documentos**
2. Configure mensagens para cada tipo de documento
3. Use placeholders: `{{title}}`, `{{date}}`, etc.

### 3. Gerar Documento Durante Consulta

1. Na página de atendimento, vá para a aba **Documentos**
2. Clique em **Gerar Documento**
3. Selecione o template desejado
4. Preencha os campos (alguns já vêm preenchidos com dados do paciente)
5. Clique em **Gerar Documento**
6. Baixe ou envie diretamente ao paciente

### 4. Visualizar Documentos do Paciente

1. Na aba **Documentos** da consulta
2. Veja todos os documentos emitidos
3. Baixe ou reenvie documentos

## Preparação para Notas Fiscais

O sistema está preparado para integração com APIs de notas fiscais:

- Campo `type: 'invoice'` já suportado
- Estrutura de metadados permite armazenar dados específicos de NF
- Template pode ser configurado para formato de nota fiscal
- Envio automático preparado para integração futura

## Próximos Passos (Opcional)

1. **Integração de Email**: Implementar envio real de emails (atualmente apenas estrutura)
2. **Assinatura Digital**: Integrar com certificado digital para assinatura eletrônica
3. **API de Notas Fiscais**: Integrar com provedor de NF-e
4. **Preview de Template**: Visualizar template antes de gerar
5. **Histórico de Alterações**: Rastrear mudanças em templates

## Dependências Adicionadas

- `jspdf` - Geração de PDFs
- `html2canvas` - Conversão de HTML para imagem/PDF

## Notas Importantes

1. **Storage Bucket**: É necessário criar o bucket `documents` no Supabase Storage manualmente
2. **Políticas RLS**: As políticas de segurança estão configuradas no script de migração
3. **Assinatura**: Atualmente usa nome do profissional, pode ser expandido para assinatura digital
4. **Email**: Estrutura preparada, mas precisa de integração com serviço de email

## Suporte

Para dúvidas ou problemas, consulte:
- Logs do console do navegador
- Logs do Supabase
- Documentação das APIs utilizadas

