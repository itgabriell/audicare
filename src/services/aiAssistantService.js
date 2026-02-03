import axios from 'axios';
import { chatwootService } from './chatwootService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash'; // Modelo rápido e eficiente

const SYSTEM_PROMPT = `
IDENTIDADE: Você é a Clara, assistente virtual da clínica (Audicare) em Brasília.
MISSÃO: Realizar triagem básica de novos pacientes via WhatsApp.
TOM DE VOZ: Empático, acolhedor, profissional e direto. Use emojis com moderação (👂, ✨). Respostas curtas (máximo 2 frases por vez).

PROTOCOLO DE TRIAGEM (Siga esta ordem e não pule etapas):
1. Descobrir para quem é o atendimento (Paciente ou familiar?).
2. Histórico: Já usa aparelho auditivo ou é a primeira vez?
3. Queixa Principal: Zumbido, dificuldade na TV, ou conversas em grupo?

REGRAS DE SEGURANÇA (GATILHOS):
- NÃO dê diagnósticos médicos.
- NÃO invente preços (se perguntarem, diga: "Temos condições especiais de Carnaval com 18x sem juros, 40% de desconto, a Dra. durante a avaliação te oferece a melhor solução para o seu caso e as informações de valor.").
- NÃO agende horários (apenas diga que vai passar para a agenda).
- EMERGÊNCIA: Se o paciente relatar dor súbita, sangue ou infecção grave, oriente buscar emergência médica e encerre imediatamente com [HANDOFF].

ENCERRAMENTO (HANDOFF):
Assim que você tiver as 3 informações da triagem, ou se o cliente pedir humano, ou se a conversa fugir do script, você DEVE encerrar sua resposta com a tag: [HANDOFF].
Exemplo: "Entendi! ✨ Vou passar seu caso para nossa especialista analisar a agenda agora mesmo. [HANDOFF]"
`.trim();

class AIAssistantService {

  /**
   * Processa uma mensagem recebida e gera uma resposta via Gemini
   * @param {string|number} conversationId - ID da conversa no Chatwoot
   * @param {string} messageContent - Conteúdo da mensagem do usuário
   * @param {object} contact - Dados do contato (nome, telefone) - opcional
   * @returns {Promise<{response: string, shouldHandoff: boolean}>}
   */
  async processMessage(conversationId, messageContent, contact = {}) {
    if (!GEMINI_API_KEY) {
      console.error('[Clara] Erro: GEMINI_API_KEY não configurada.');
      return {
        response: "Desculpe, estou com uma instabilidade momentânea. Um atendente humano logo falará com você.",
        shouldHandoff: true
      };
    }

    try {
      // 1. Recuperar histórico (últimas 5 mensagens)
      const history = await chatwootService.getConversationMessages(conversationId);

      // Filtrar e formatar histórico para o Gemini
      // Chatwoot messages: { content, message_type: 0 (incoming) | 1 (outgoing) }
      // Gemini API expects: { role: "user" | "model", parts: [{ text: "..." }] }
      const formattedHistory = history
        .slice(-5) // Pegar últimas 5
        .map(msg => ({
          role: msg.message_type === 1 ? 'model' : 'user', // 1=outgoing (Clara), 0=incoming (User)
          parts: [{ text: msg.content || '' }]
        }));

      // Adicionar a mensagem atual se não estiver no histórico (dependendo da latência do webhook)
      // Normalmente o webhook vem depois da mensagem persistida, mas garantimos o contexto.
      // Se a última mensagem do histórico == messageContent, não duplicar.
      const lastMsg = formattedHistory[formattedHistory.length - 1];
      if (!lastMsg || (lastMsg.role === 'user' && lastMsg.parts[0].text !== messageContent)) {
        // Nota: Na prática o webhook dispara APÓS criar, então o fetch deve trazer a msg.
        // Mas se o fetch for rápido demais ou lento, garantimos que 'messageContent' é o último user input.
      }

      // Construir payload para Gemini
      const contents = [
        {
          role: "user",
          parts: [{ text: `System Instruction: ${SYSTEM_PROMPT}` }]
        },
        ...formattedHistory,
        // Garantir que a instrução do sistema esteja reforçada ou apenas no contexto. 
        // A API suporta 'systemInstruction' nativamente em models novos, ou via context.
        // Vamos usar a estrutura padrão generateContent payload.
      ];

      // Ajuste para usar systemInstruction corretamente se suportado, ou prompt hack
      // Para gemini-1.5-flash via API direta REST axios:
      const apiPayload = {
        contents: formattedHistory.length > 0 ? formattedHistory : [{ role: "user", parts: [{ text: messageContent }] }],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150, // Respostas curtas
        }
      };

      // Se o histórico veio vazio (ou falha), usar input direto
      if (formattedHistory.length === 0) {
        apiPayload.contents = [{ role: "user", parts: [{ text: messageContent }] }];
      }

      // 2. Chamada à API Gemini
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const { data } = await axios.post(url, apiPayload);

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Sem resposta do Gemini.');
      }

      let responseText = data.candidates[0].content.parts[0].text;

      // 3. Verificar Handoff
      const shouldHandoff = responseText.includes('[HANDOFF]');

      // Limpar tag do texto final
      responseText = responseText.replace('[HANDOFF]', '').trim();

      return { response: responseText, shouldHandoff };

    } catch (error) {
      console.error('[Clara] Erro ao processar mensagem:', error.response?.data || error.message);
      // Fallback gracefull
      return {
        response: "Entendi. Vou chamar um especialista para te ajudar melhor.",
        shouldHandoff: true
      };
    }
  }

  /**
   * Entrypoint para o Webhook do Chatwoot
   * @param {object} payload - Payload JSON recebido do Chatwoot
   */
  async handleWebhook(payload) {
    try {
      const { event, message_type, content, conversation, sender, private: isPrivate } = payload;

      // Validar se é mensagem de usuário e não é privada
      if (event !== 'message_created' || message_type !== 'incoming' || isPrivate) {
        return; // Ignorar
      }

      // Verificar se é uma conversa "Nova" ou qualificada para triagem
      // Critério: Status 'pending' ou a gente verifica outro parâmetro.
      // O usuário pediu: "Se a conversa é nova".
      // Chatwoot status: 'open', 'resolved', 'pending'. 
      // Vamos processar se status !== 'resolved'.
      // Para evitar loop infinito em conversas antigas, idealmente checaríamos agent_bot ou labels.
      // Mas seguindo o pedido estrito: "intercepte mensagens de conversas novas"
      // Como identificar "conversa nova" apenas pelo payload? payload.conversation.status

      // PROTEÇÃO: Não responder se já tiver agente humano atribuído?
      if (conversation.meta && conversation.meta.assignee) {
        console.log('[Clara] Ignorando conversa com agente humano atribuído.');
        return;
      }

      const conversationId = conversation.id;
      const contactName = sender ? sender.name : 'Cliente';

      console.log(`[Clara] Processando mensagem de ${contactName} (Conv ID: ${conversationId})`);

      // CHAMAR A IA
      const { response, shouldHandoff } = await this.processMessage(conversationId, content, sender);

      // ENVIAR RESPOSTA
      if (response) {
        await chatwootService.sendMessage(sender.phone_number || '', response, contactName);
      }

      // GERENCIAR HANDOFF
      if (shouldHandoff) {
        console.log(`[Clara] Realizando HANDOFF para conv ${conversationId}`);

        // 1. Alterar status para Open (Aberto/Pendente de humano)
        await chatwootService.updateConversationStatus(conversationId, 'open');

        // 2. Adicionar Nota Privada
        await chatwootService.createPrivateNote(conversationId, "🤖 Clara: Triagem finalizada. Lead pronto para agendamento.");
      }

    } catch (error) {
      console.error('[Clara] Erro no Webhook Handler:', error);
    }
  }
}

export const aiAssistantService = new AIAssistantService();
