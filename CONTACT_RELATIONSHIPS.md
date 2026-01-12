# Relacionamento de Contatos com Entidades do Sistema

A tabela `contact_relationships` é a chave para criar uma visão 360º dos seus contatos. Ela permite vincular um contato da Caixa de Entrada a um ou mais registros em outras partes do sistema, como Pacientes, Leads do CRM ou Reparos.

## Como Funciona

A tabela funciona como uma ponte polimórfica. Em vez de adicionar colunas como `patient_id` ou `lead_id` diretamente na tabela `contacts` (o que seria inflexível), usamos uma tabela separada para registrar essas associações.

**Estrutura da Tabela `contact_relationships`:**

- `id` (uuid): Chave primária da relação.
- `contact_id` (uuid): A chave estrangeira que aponta para o registro na tabela `contacts`.
- `related_entity_type` (enum): Um tipo enumerado que define **qual tabela** está sendo relacionada. Os valores possíveis são:
    - `'patient'` (para a tabela `patients`)
    - `'lead'` (para a tabela `contacts` ou uma futura tabela `leads`)
    - `'repair'` (para a tabela `repairs`)
- `related_entity_id` (uuid): O `id` do registro específico na tabela definida por `related_entity_type`.

## Exemplo Prático

Imagine que um novo contato, "Maria Silva" (`contacts.id = uuid-da-maria`), envia uma mensagem e se torna um paciente (`patients.id = uuid-do-paciente-maria`). Para vincular os dois, você inseriria um novo registro na tabela `contact_relationships`: