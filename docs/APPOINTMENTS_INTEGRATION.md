# Documentação de Agendamentos Integrados no Atendimento Multicanal

Este documento descreve como a funcionalidade de agendamento foi integrada ao módulo de Atendimento Multicanal, permitindo a gestão de agendamentos diretamente das conversas.

## Visão Geral

A integração de agendamentos visa otimizar o fluxo de trabalho dos agentes, permitindo que eles consultem, criem e gerenciem agendamentos sem sair da tela de chat, utilizando dados do contato e templates de mensagem.

## 1. Estrutura de Banco de Dados Relevante

As seguintes tabelas são cruciais para esta integração:

*   **`contacts`**: Armazena informações de contatos e observações gerais sobre eles.
    *   `id`, `name`, `phone`, `channel_type`, `notes` (observações gerais e persistentes).

*   **`patients`**: O registro mestre para pacientes da clínica.
    *   `id`, `name`, `phone`, `email`, `notes` (observações gerais do paciente).

*   **`contact_relationships`**: Tabela de junção que associa um `contact` a uma entidade, como um `patient`.
    *   `contact_id` (FK para `contacts.id`)
    *   `related_entity_id` (FK para `patients.id`, neste caso)
    *   `related_entity_type` (ex: 'patient')

*   **`appointments`**: Armazena todos os agendamentos.
    *   `id`, `patient_id` (FK para `patients.id`), `appointment_date`, `status`.
    *   **`appointment_type`**: Tipo de consulta (campo obrigatório com valores pré-definidos).
    *   **`professional_name`**: Nome do profissional (atualmente fixo).
    *   **`notes`**: Observações específicas daquela consulta.

O fluxo de dados é: `Contact` -> `Contact Relationship` -> `Patient` -> `Appointments`.

## 2. Regras de Negócio e Campos Personalizados

### Tipos Oficiais de Agendamento
A coluna `appointment_type` é obrigatória e deve conter um dos seguintes quatro valores:
1.  **"Primeiro agendamento/avaliação"**: Para novos pacientes ou avaliações iniciais.
2.  **"Retorno pós-compra"**: Acompanhamento após a aquisição de um produto/serviço.
3.  **"Retorno comum"**: Consultas de rotina e acompanhamento padrão.
4.  **"Ajuste"**: Para ajustes em aparelhos ou tratamentos.

### Nome do Profissional (`professional_name`)
*   Atualmente, este campo é preenchido automaticamente com o valor **"Dra. Karine Brandão"** em todos os novos agendamentos.
*   A interface do usuário exibe este campo como somente leitura, refletindo a regra de negócio atual. Futuramente, poderá ser um campo de seleção.

### Distinção entre Tipos de Observações
É crucial diferenciar os dois campos de "notas":
*   **`contacts.notes` (Observações do Paciente)**:
    *   **Propósito**: Armazena informações gerais e **persistentes** sobre o paciente/contato.
    *   **Exemplos**: "Paciente tem preferência por contato via WhatsApp pela manhã", "Mencionar sempre o nome do filho, João", "Tem dificuldade auditiva severa no ouvido esquerdo".
    *   **Visibilidade**: Fica visível no painel de informações do contato e é relevante para **todas** as interações.

*   **`appointments.notes` (Observações desta consulta)**:
    *   **Propósito**: Armazena informações **específicas e contextuais** de um único agendamento.
    *   **Exemplos**: "Paciente virá acompanhado da filha", "Solicitou para confirmar 24h antes", "Trazer exames anteriores para comparação".
    *   **Visibilidade**: Aparece junto aos detalhes daquele agendamento específico na lista de "Próximas consultas".

## 3. Hooks Personalizados

### `useContactDetails.js`
*   **Responsabilidade**: Dado um `contactId`, busca todas as informações agregadas, incluindo `contacts.notes` e a lista de agendamentos futuros com `appointment_type`, `professional_name` e `appointments.notes`.
*   **Realtime**: Se inscreve em alterações nas tabelas `contacts`, `contact_relationships`, e `appointments` para manter a UI sempre atualizada.

## 4. Componentes da Interface

### `ContactPanel.jsx`
*   **Aba "Info"**: Mostra detalhes do contato e uma área para visualizar e editar as "Observações do Paciente" (`contacts.notes`) de forma inline.
*   **Aba "Agenda"**:
    *   Lista os próximos agendamentos, exibindo `appointment_date`, `appointment_type`, e `professional_name`.
    *   Mostra um ícone (📝) se o agendamento tiver "Observações desta consulta" (`appointments.notes`), com um tooltip para visualização rápida.
    *   Contém um botão "Agendar Consulta" que abre o modal de agendamento.

### `AppointmentDialog.jsx`
*   **Função**: Modal para criar e editar agendamentos.
*   **Campos**:
    *   `appointment_type`: Um `Select` com os quatro tipos oficiais.
    *   `professional_name`: Um campo de input desabilitado, pré-preenchido.
    *   `notes`: Uma `Textarea` para as "Observações desta consulta".
*   **Salvar**: Ao salvar, insere ou atualiza o registro na tabela `appointments`, incluindo os novos campos.

## 5. Fluxo de Criação de Agendamento

1.  **Usuário na Caixa de Entrada**: Um agente conversa com um contato.
2.  **Abrir Painel**: O agente vê os detalhes no `ContactPanel`.
3.  **Adicionar Observação Geral**: Opcionalmente, na aba "Info", o agente edita e salva uma observação persistente sobre o paciente.
4.  **Navegar para Agenda**: O agente clica na aba "Agenda".
5.  **Iniciar Agendamento**: O agente clica em "Agendar Consulta".
6.  **Abrir Modal**: O `AppointmentDialog` abre. O agente seleciona o paciente.
7.  **Preencher Formulário**: O agente seleciona um dos quatro **tipos de consulta**, confirma o profissional e preenche a data/hora. Opcionalmente, adiciona notas **específicas para esta consulta**.
8.  **Salvar**: O agente salva o agendamento.
9.  **Atualização Automática**: O Supabase Realtime atualiza o `ContactPanel`, que exibe o novo agendamento na lista com todos os detalhes.