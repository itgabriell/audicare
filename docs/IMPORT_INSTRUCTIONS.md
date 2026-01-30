# 📥 Instruções para Importação de Pacientes

## 🎯 Objetivo
Importar corretamente todos os pacientes da planilha `PACIENTES1901.xlsx` (convertida para `pacientes.csv`) com todos os campos preenchidos corretamente.

## 📋 Pré-requisitos
1. Arquivo `pacientes.csv` na raiz do projeto
2. Acesso ao painel do Supabase para executar SQL

## 🚀 Passos para Execução

### 1. Executar Migração da Base de Dados
**IMPORTANTE:** Execute primeiro no Supabase SQL Editor

```sql
-- Execute o conteúdo do arquivo: migrations/033_add_patient_fields.sql
```

Este script adicionará os campos necessários:
- `cpf`, `email`, `birthdate`, `gender`
- `document`, `zip_code`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`
- `medical_history`, `allergies`, `medications`

### 2. Limpar Dados Incorretos (Opcional)
Se houver dados incorretos da importação anterior:

```bash
node cleanup_patients.cjs
```

Este script irá:
- Mostrar estatísticas atuais
- Apagar todos os pacientes existentes
- Limpar contatos relacionados

### 3. Executar Importação Corrigida
```bash
node import_pacientes_fixed.cjs
```

Este script irá:
- Ler o arquivo `pacientes.csv`
- Mapear todos os campos corretamente
- Inserir pacientes com dados completos
- Criar telefones múltiplos na tabela `patient_phones`
- Vincular contatos WhatsApp na tabela `contacts`

### 4. Verificar Importação
```bash
node verify_import.cjs
```

Este script irá:
- Mostrar estatísticas da importação
- Verificar exemplos de dados importados
- Validar telefones múltiplos
- Confirmar contatos WhatsApp criados

## 📊 Mapeamento de Campos

### Campos Principais (tabela `patients`):
| Campo CSV | Campo Banco | Descrição |
|-----------|-------------|-----------|
| `Nome` | `name` | Nome completo |
| `CPF` | `cpf` | CPF (apenas números) |
| `CPF` | `document` | CPF formatado (000.000.000-00) |
| `Email` | `email` | E-mail principal |
| `Data de Nasc.` | `birthdate` | Data de nascimento (YYYY-MM-DD) |
| `Gênero` | `gender` | 'male' ou 'female' |
| `Telefone` | `phone` (compatibilidade) | Telefone principal |
| `Celular` | `patient_phones` | Telefones múltiplos |

### Campos de Endereço (tabela `patients`):
| Campo CSV | Campo Banco |
|-----------|-------------|
| `Cep` | `zip_code` |
| `Logradouro` | `street` |
| `Número` | `number` |
| `Bairro` | `neighborhood` |
| `Cidade` | `city` |
| `Estado` | `state` |

### Campos Adicionais (tabela `patients.notes`):
- Estado Civil
- Nome da Mãe/Pai/Cônjuge
- Renda
- Empresa/Cargo
- RG/Orgão Emissor
- Nacionalidade/Naturalidade
- Observações
- Particularidades

## 🔍 Validações Implementadas

1. **CPF**: Armazenado em 2 formatos:
   - `cpf`: apenas números (para buscas)
   - `document`: formatado (para exibição/NF-e)

2. **Datas**: Convertidas de DD/MM/YYYY para YYYY-MM-DD

3. **Telefones**: Múltiplos números suportados:
   - Telefone fixo → `phone_type: 'home'`
   - Celular → `phone_type: 'mobile', is_whatsapp: true`

4. **Gênero**: Normalizado para 'male'/'female'

5. **Duplicatas**: Verificação por nome antes da inserção

## 📈 Resultado Esperado

Após execução bem-sucedida:
- ✅ Todos os pacientes importados com dados completos
- ✅ Campos de endereço preenchidos para emissão de NF-e
- ✅ Telefones múltiplos configurados
- ✅ Contatos WhatsApp automaticamente criados/vinculados
- ✅ Estatísticas detalhadas de sucesso

## 🆘 Troubleshooting

### Erro: "supabaseUrl is required"
- Verifique se o arquivo `.env.local` existe
- Confirme se `VITE_SUPABASE_URL` está definido

### Erro: "Tabela patients não tem coluna X"
- Execute primeiro a migração SQL `033_add_patient_fields.sql`

### Importação não funciona
- Verifique se o arquivo `pacientes.csv` existe na raiz
- Confirme encoding (deve ser lido como 'latin1')
- Verifique logs de erro específicos

### Dados incorretos após importação
- Execute `cleanup_patients.cjs` para limpar
- Execute novamente a importação

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Execute `node verify_import.cjs` para diagnóstico
2. Verifique os logs de erro específicos
3. Confirme se todos os passos foram executados na ordem correta
