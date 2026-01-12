# Guia de Associação: Contatos e Pacientes

Este documento detalha o fluxo de trabalho e a lógica para associar um `Contato` de comunicação (da Caixa de Entrada) a um `Paciente` registrado no sistema. O objetivo é unificar a comunicação e os dados clínicos, garantindo que cada conversa tenha um vínculo claro com o registro do paciente correspondente.

## 1. Requisito Fundamental: Formato de Telefone E.164

Para garantir a consistência e a compatibilidade com APIs de comunicação como o WhatsApp, todos os números de telefone no sistema **devem** ser armazenados no formato E.164.

-   **O que é o formato E.164?** É um padrão internacional que garante a unicidade de um número de telefone em todo o mundo.
    -   Começa com um `+`.
    -   Seguido pelo código do país (ex: `55` para o Brasil).
    -   Seguido pelo número nacional (DDD + número) sem espaços, traços ou parênteses.
-   **Exemplo Válido:** `+5511999998888`
-   **Exemplos Inválidos:** `(11) 99999-8888`, `11999998888`, `+55 (11) 99999-8888`

O sistema possui utilitários (`formatPhoneE164`, `validatePhoneE164`) para automaticamente converter e validar os números de telefone durante o cadastro de pacientes e contatos, e antes do envio de mensagens.

## 2. Deduplicação de Contatos

Para evitar a criação de múltiplos registros para o mesmo número de telefone, o sistema utiliza a função `findOrCreateContact`.

-   **Como funciona?**
    1.  Sempre que uma nova conversa é iniciada (por exemplo, ao clicar no ícone do WhatsApp na ficha de um paciente), o sistema primeiro verifica se já existe um `Contato` com aquele número de telefone (em formato E.164) para a clínica atual.
    2.  **Se o contato já existe**, o sistema o reutiliza.
    3.  **Se o contato não existe**, um novo registro é criado na tabela `contacts`.

Isso garante que um único número de telefone corresponda a um único registro de `Contato` por clínica.

## 3. Fluxo de Associação de Contato a Paciente

Um `Contato` pode existir sem estar vinculado a um `Paciente`. Isso ocorre quando uma nova pessoa entra em contato com a clínica. O fluxo de associação permite vincular essa comunicação a um registro de paciente existente.

### Fluxo na Interface (UI)

1.  **Verificação do Status:** No painel lateral da Caixa de Entrada (`ContactPanel`), o sistema verifica se o `contato` selecionado está associado a um `paciente`. Essa verificação é feita buscando um registro na tabela `contact_relationships`.

2.  **Contato Não Associado:**
    -   O painel exibirá uma mensagem clara, como "Este contato não está associado a um paciente."
    -   Um botão **"Associar a Paciente"** será exibido.
    -   Ao clicar no botão, um modal (`AssociatePatientDialog`) é aberto.
    -   O usuário pode buscar um paciente existente pelo nome ou CPF.
    -   Após selecionar o paciente e confirmar, a função `linkContactToPatient` é chamada.

3.  **Contato Já Associado:**
    -   O painel exibirá as informações do paciente vinculado, como nome e um link/botão para **"Ver Perfil Completo"**.
    -   Clicar neste botão navegará o usuário para a página de detalhes do paciente (`/patients/:id`).

### Lógica de Backend (Supabase)

-   A associação é formalizada pela criação de uma nova linha na tabela `contact_relationships`.
-   Esta tabela armazena o `contact_id`, o `related_entity_id` (que será o `patient_id`) e o `related_entity_type` ('patient').
-   A função `linkContactToPatient(contactId, patientId, clinicId)` gerencia essa criação, garantindo que não haja associações duplicadas.

## 4. Visualização no Perfil do Paciente

Para fechar o ciclo, a página de detalhes do paciente (`PatientDetails`) também reflete essa associação:

-   A seção de informações do paciente (`PatientInfo`) exibe se há um **contato associado**, confirmando o vínculo.
-   O número de telefone do paciente é sempre exibido no formato E.164.
-   O ícone do WhatsApp ao lado do telefone permite iniciar uma conversa, acionando o fluxo `findOrCreateConversation` que, por sua vez, reutiliza o contato existente.