# Sistema de Múltiplos Telefones para Pacientes

## Visão Geral

Sistema implementado para permitir que pacientes tenham múltiplos números de telefone cadastrados. Isso é especialmente útil quando:
- O paciente tem mais de um número
- O contato é feito através de parente, filho ou amigo
- Na importação de dados, alguns pacientes já possuem múltiplos números

## Funcionalidades Implementadas

### 1. Estrutura do Banco de Dados
- ✅ Tabela `patient_phones` criada
- ✅ Suporte a tipos de telefone (mobile, home, work, relative, friend, other)
- ✅ Campo para nome do contato (quando não é o próprio paciente)
- ✅ Marcação de telefone principal
- ✅ Indicação se tem WhatsApp
- ✅ Observações por telefone
- ✅ Migração automática de telefones existentes

### 2. Interface de Cadastro/Edição
- ✅ Componente `PatientPhonesManager` para gerenciar múltiplos telefones
- ✅ Adicionar/remover telefones dinamicamente
- ✅ Seleção de tipo de telefone
- ✅ Campo para nome do contato (parente/amigo)
- ✅ Marcação de telefone principal
- ✅ Indicação de WhatsApp
- ✅ Validação de telefones

### 3. Exibição de Telefones
- ✅ Componente `PatientPhonesDisplay` para exibir todos os telefones
- ✅ Destaque para telefone principal
- ✅ Badges para tipo e WhatsApp
- ✅ Botão para enviar mensagem via WhatsApp
- ✅ Exibição de nome do contato quando aplicável

### 4. Integração com Importação
- ✅ Suporte a múltiplos telefones separados por vírgula, ponto e vírgula ou pipe
- ✅ Suporte a colunas phone2, phone3, etc.
- ✅ Validação individual de cada telefone
- ✅ Criação automática de registros na tabela patient_phones

### 5. Compatibilidade
- ✅ Campo `phone` na tabela `patients` mantido para compatibilidade
- ✅ Telefone principal sempre sincronizado com campo `phone`
- ✅ Componentes existentes continuam funcionando
- ✅ Busca por telefone mantida

## Estrutura da Tabela

### `patient_phones`
- `id` - UUID (PK)
- `patient_id` - UUID (FK para patients)
- `phone` - TEXT (número do telefone)
- `phone_type` - TEXT (mobile, home, work, relative, friend, other)
- `contact_name` - TEXT (nome do contato se não for o paciente)
- `is_primary` - BOOLEAN (telefone principal)
- `is_whatsapp` - BOOLEAN (tem WhatsApp)
- `notes` - TEXT (observações)
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

## Como Usar

### Cadastrar Paciente com Múltiplos Telefones

1. Ao criar/editar paciente, a seção "Telefones de Contato" permite:
   - Adicionar múltiplos telefones
   - Definir tipo de cada telefone
   - Marcar um como principal
   - Indicar se tem WhatsApp
   - Adicionar nome do contato (para parente/amigo)
   - Adicionar observações

### Importar Pacientes com Múltiplos Telefones

**Opção 1: Telefones separados por vírgula**
```
Nome,CPF,Telefone
João Silva,123.456.789-00,"(11) 99999-9999, (11) 88888-8888"
```

**Opção 2: Colunas separadas**
```
Nome,CPF,Telefone,Telefone2,Telefone3
João Silva,123.456.789-00,(11) 99999-9999,(11) 88888-8888,(11) 77777-7777
```

### Visualizar Telefones

- Na página de detalhes do paciente, todos os telefones são exibidos
- O telefone principal é destacado
- Cada telefone mostra tipo, se tem WhatsApp, e nome do contato se aplicável

## Migração Automática

A migração SQL (`028_create_patient_phones.sql`) automaticamente:
1. Cria a tabela `patient_phones`
2. Migra telefones existentes da tabela `patients` para `patient_phones`
3. Marca o telefone migrado como principal
4. Mantém o campo `phone` na tabela `patients` para compatibilidade

## Componentes Atualizados

- ✅ `PatientDialog` - Formulário de cadastro/edição
- ✅ `PatientInfo` - Exibição de informações
- ✅ `PatientCard` - Card na lista de pacientes
- ✅ `PatientDetails` - Página de detalhes
- ✅ `AppointmentDialog` - Envio de mensagem
- ✅ `DocumentSenderService` - Envio de documentos
- ✅ `ImportData` - Importação de dados
- ✅ `database.js` - Funções de banco de dados

## Próximos Passos (Opcional)

1. **Busca Avançada**: Buscar pacientes por qualquer telefone cadastrado
2. **Estatísticas**: Relatório de quantos pacientes têm múltiplos telefones
3. **Histórico**: Rastrear mudanças nos telefones
4. **Validação de Duplicatas**: Verificar se telefone já está cadastrado para outro paciente

## Notas Importantes

1. **Compatibilidade**: O campo `phone` na tabela `patients` é mantido e sincronizado com o telefone principal
2. **Telefone Principal**: Sempre há um telefone marcado como principal (garantido por trigger)
3. **Validação**: Todos os telefones são validados antes de salvar
4. **RLS**: Políticas de segurança garantem que usuários só vejam telefones de pacientes da sua clínica

