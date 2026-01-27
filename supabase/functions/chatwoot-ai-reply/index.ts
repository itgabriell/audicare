import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- CONFIGURAÇÕES DA PERSONA ---
const AGENT_NAME = "Clara";
const CLINIC_NAME = "Audicare";
const SYSTEM_PROMPT = `
Você é a ${AGENT_NAME}, assistente pessoal da clínica ${CLINIC_NAME}.
Seu tom é acolhedor, empático e extremamente profissional, mas natural (como uma secretaria humana no WhatsApp).
Use emojis moderadamente (1 ou 2 por mensagem, quuando sentir que a conversa permite, não seja petulante.).

OBJETIVO:
Acolher o paciente, tirar dúvidas básicas usando seu conhecimento e tentar agendar uma avaliação.
Se não souber a resposta, diga que vai verificar com a equipe Audicare logo pela manhã.

IMPORTANTE:
- Você tem acesso a um "Contexto" de conversas passadas. Use-o para responder com precisão.
- Se o contexto não tiver a resposta, seja honesta e ofereça retorno posterior.
- NUNCA fale preços médicos se não estiver no contexto.
- Mantenha respostas curtas (máximo 3 frases), estilo chat.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json();
    
    // 1. Verificações Básicas (Ignora mensagens próprias ou privadas)
    if (payload.message_type !== 'incoming' || payload.private) {
      return new Response('Ignored', { status: 200 });
    }

    // 2. Verificação de Horário (Só responde fora do expediente?)
    // Exemplo: Antes das 08h ou depois das 18h, ou fins de semana.
    // Para testar AGORA, vamos comentar essa trava. Depois descomentamos.
    /*
    const now = new Date();
    const hour = now.getHours(); // Hora de Brasília (-3) precisaria de ajuste se o servidor for UTC
    // Ajuste fuso horário simples (UTC-3)
    const brHour = (hour - 3 + 24) % 24; 
    const isBusinessHours = brHour >= 8 && brHour < 18;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    if (isBusinessHours && !isWeekend) {
       console.log("Horário comercial - Deixando para humano.");
       return new Response('Business Hours', { status: 200 });
    }
    */

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Precisa da Service Role para buscar dados
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';

    if (!supabaseUrl || !supabaseKey || !geminiKey || !chatwootToken) {
      throw new Error("Configurações de API ausentes.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userMessage = payload.content;
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;

    console.log(`📩 Mensagem recebida de ${payload.sender?.name}: "${userMessage}"`);

    // 3. Gerar Embedding da Pergunta (Para buscar no cérebro)
    const embedResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: userMessage }] }
        })
      }
    );
    const embedData = await embedResponse.json();
    const embedding = embedData.embedding.values;

    // 4. Buscar Memórias Semelhantes (RAG)
    const { data: similarDocs } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.5, // 50% de similaridade mínima
      match_count: 3
    });

    const contextText = similarDocs.map(doc => `P: ${doc.content}\nR: ${doc.response}`).join("\n---\n");
    console.log(`🧠 Memórias recuperadas: ${similarDocs.length}`);

    // 5. Gerar Resposta com Gemini
    const finalPrompt = `
      ${SYSTEM_PROMPT}

      CONTEXTO RECUPERADO DA BASE DE CONHECIMENTO (MEMÓRIA):
      ${contextText || "Nenhuma memória específica encontrada sobre isso."}

      MENSAGEM DO CLIENTE:
      "${userMessage}"

      SUA RESPOSTA (Seja breve e natural):
    `;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }]
        })
      }
    );
    const aiData = await aiResponse.json();
    const replyText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) throw new Error("IA não gerou resposta.");

    console.log(`🤖 Resposta gerada: "${replyText}"`);

    // 6. Delay Humanizado (Simulando Digitação)
    // 15 segundos de "pensar" + digitar
    await new Promise(r => setTimeout(r, 15000)); 

    // 7. Enviar para o Chatwoot
    const cwResponse = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'api_access_token': chatwootToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: replyText,
        message_type: 'outgoing',
        private: false
      })
    });

    if (!cwResponse.ok) {
        const err = await cwResponse.text();
        throw new Error(`Erro Chatwoot: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("🚨 Erro AI Reply:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})