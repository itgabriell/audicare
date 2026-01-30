# Próximos Passos para o Módulo de Atendimento Multicanal

Com a Fase 1 (Estrutura Visual) concluída, este documento descreve as próximas ações recomendadas para a evolução do módulo de Atendimento Multicanal.

## Fase 2: Integração com WhatsApp via n8n

Esta é a próxima fase crítica, que tornará a Caixa de Entrada funcional para o canal mais importante.

**Ações Recomendadas:**

1.  **Configurar o Ambiente n8n:**
    *   Garantir que uma instância do n8n esteja rodando e acessível.
    *   Instalar e configurar os nós necessários para a integração com o provedor de WhatsApp (ex: Z-API, Meta Cloud API).

2.  **Desenvolver a Edge Function de Recebimento (`n8n-webhook`):**
    *   Finalizar a lógica da Edge Function no Supabase que recebe dados do n8n.
    *   Garantir que ela chame a função RPC `handle_incoming_message` no banco de dados para persistir as mensagens.

3.  **Criar o Workflow n8n de Recebimento:**
    *   Criar um workflow no n8n que:
        1.  Recebe um webhook do provedor de WhatsApp.
        2.  Formata (normaliza) o payload da mensagem.
        3.  Envia os dados formatados para a `n8n-webhook` Edge Function do Supabase.

4.  **Desenvolver a Lógica de Envio:**
    *   Criar uma nova Edge Function no Supabase (ex: `send-whatsapp-message`) que será chamada pelo frontend.
    *   Esta função deve acionar um segundo workflow no n8n, passando o conteúdo da mensagem e o destinatário.
    *   Criar o workflow n8n que recebe essa chamada e a envia para a API do provedor de WhatsApp.
    *   Atualizar a função `sendMessage` no hook `useMessages.js` para chamar a nova Edge Function de envio.

5.  **Implementar Webhooks de Status de Entrega:**
    *   Configurar o provedor de WhatsApp para enviar webhooks de status (`sent`, `delivered`, `read`).
    *   Criar um workflow no n8n para receber esses status e atualizar a coluna `status` na tabela `messages` do Supabase.

## Fase 3 e Além: Expansão e Aprimoramento

Após a conclusão da Fase 2, o foco pode se voltar para a expansão e o aprimoramento do módulo.

1.  **Integração de Novos Canais (Instagram, Facebook):**
    *   Seguir um fluxo semelhante ao da Fase 2, criando workflows n8n específicos para cada canal e adaptando a lógica de recebimento e envio.
    *   Atualizar o frontend para refletir os novos canais nos filtros e badges.

2.  **Implementação de Templates de Mensagem:**
    *   Criar a interface de gerenciamento de templates.
    *   Integrar o seletor de templates no `ChatInput.jsx`.
    *   Implementar a lógica de substituição de variáveis.

3.  **Integração de Agendamentos:**
    *   Conectar o `RightPanel.jsx` aos dados da tabela `appointments`.
    *   Desenvolver o modal de criação de agendamento a partir da Caixa de Entrada.

4.  **Automações e IA:**
    *   Explorar a criação de chatbots simples, respostas automáticas e roteamento inteligente de conversas.

A conclusão da Fase 2 já entregará um valor imenso, permitindo que a equipe de atendimento gerencie as conversas do WhatsApp diretamente pelo sistema AudiCare.