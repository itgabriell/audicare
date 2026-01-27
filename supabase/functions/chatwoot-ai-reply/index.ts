import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json();

    if (payload.message_type !== 'incoming' || payload.private) {
      return new Response('Ignored', { status: 200 });
    }

    // --- CONFIGURAÇÃO DE HORÁRIO ---
    const now = new Date();
    const utcHour = now.getUTCHours(); 
    const utcMinutes = now.getUTCMinutes();
    let brHour = utcHour - 3;
    if (brHour < 0) brHour += 24;

    // Horário de trabalho da Clara: 17:00 até 08:30
    // Se estiver entre 08:30 e 17:00 (dia de semana), ela não responde.
    const isBusinessHour = (brHour > 8 || (brHour === 8 && utcMinutes >= 30)) && brHour < 17;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // REMOVA O COMENTÁRIO ABAIXO PARA ATIVAR O HORÁRIO
    /*
    if (isBusinessHour && !isWeekend) {
       return new Response('Business Hours', { status: 200 });
    }
    */

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';

    if (!supabaseUrl || !supabaseKey || !geminiKey || !chatwootToken) {
      throw new Error("Configurações de API ausentes.");
    }

    // --- NOME DO CLIENTE ---
    let clientName = payload.sender?.name || "";
    // Se for número, ignora. Se for nome, capitaliza.
    if (clientName.match(/^\+?[0-9\s-]+$/)) {
        clientName = ""; 
    } else {
        clientName = clientName.split(' ')[0];
        clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userMessage = payload.content;
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;

    console.log(`📩 Mensagem: "${userMessage}"`);

    // 1. EMBEDDING E BUSCA (RAG)
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
    
    let contextText = "";
    if (embedData.embedding) {
        const { data: similarDocs } = await supabase.rpc('match_knowledge', {
            query_embedding: embedData.embedding.values,
            match_threshold: 0.5,
            match_count: 2 // Reduzi para 2 para focar mais
        });
        contextText = similarDocs?.map(doc => `EXEMPLO PASSADO:\nP: ${doc.content}\nR: ${doc.response}`).join("\n---\n") || "";
    }

    // 2. PROMPT BLINDADO (CLARA 3.0)
    const SYSTEM_PROMPT = `
    Você é a Clara, da triagem da Audicare Aparelhos Auditivos.
    Sua função é APENAS acolher e fazer a triagem básica (perguntar da audiometria).
    
    REGRAS DE OURO (ANTI-ALUCINAÇÃO):
    1. O "Contexto de Referência" abaixo são conversas ANTIGAS de OUTROS pacientes. NÃO use os nomes, problemas ou detalhes deles (como "aparelho molhado", "bisavô", "Esdras"). Ignore isso se não tiver relação direta com a pergunta técnica.
    2. O cliente atual se chama: ${clientName ? clientName : "Não sabemos o nome"}.
    3. NÃO invente problemas que o cliente não relatou.
    
    SEU ROTEIRO (SCRIPT):
    Se for a primeira interação ou uma saudação ("oi", "bom dia", "preço"), responda EXATAMENTE seguindo esta estrutura (adaptando levemente para não parecer robô, mas mantendo a essência):

    "Olá ${clientName ? clientName : ""}, tudo bem? Seja bem-vindo à Audicare Aparelhos Auditivos. 
    Agradecemos seu contato. Aqui é a Clara e vou iniciar seu atendimento.
    
    Contamos com uma variedade de aparelhos auditivos de tecnologia alemã, com conexão bluetooth, discretos e eficazes.
    
    O primeiro passo é analisarmos o seu caso: você já tem o exame de Audiometria atualizado?"

    CASO O CLIENTE RESPONDA SOBRE A AUDIOMETRIA:
    - Se "SIM": Peça para ele enviar uma foto ou PDF por aqui.
    - Se "NÃO": Explique que é necessário para indicar o aparelho e pergunte se ele gostaria de agendar a avaliação.

    CONTEXTO DE REFERÊNCIA (CASOS ANTIGOS - NÃO CONFUNDA COM O ATUAL):
    ${contextText}
    
    MENSAGEM ATUAL DO CLIENTE: "${userMessage}"
    `;

    // 3. GERAÇÃO
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT }] }] })
      }
    );
    const aiData = await aiResponse.json();
    const fullReply = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!fullReply) throw new Error("IA muda.");

    // 4. DIVISÃO E ENVIO
    const messages = fullReply.split('\n').map(msg => msg.trim()).filter(msg => msg.length > 0);

    for (const [index, msg] of messages.entries()) {
        const delay = index === 0 ? 6000 : 3000; 
        await new Promise(r => setTimeout(r, delay));

        await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'api_access_token': chatwootToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: msg,
                message_type: 'outgoing',
                private: false
            })
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("🚨 Erro Clara:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})