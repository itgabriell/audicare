import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Normalizar Telefone
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, ''); 
}

// Helper: Converter Buffer para Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json();

    // 1. FILTRO BÁSICO
    if (payload.message_type !== 'incoming' || payload.private) {
      return new Response('Ignored', { status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';

    if (!supabaseUrl || !supabaseKey || !geminiKey || !chatwootToken) throw new Error("Configs ausentes.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. DISJUNTOR GERAL (Botão ON/OFF)
    const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'clara_active').single();
    if (config && config.value === false) return new Response('Clara is OFF', { status: 200 });

    // DADOS DO CLIENTE
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;
    const sender = payload.sender || {};
    let clientName = sender.name || "Cliente";
    
    // Tratamento de nome
    if (clientName.match(/^\+?[0-9\s-]+$/) || clientName.toLowerCase() === 'cliente') {
        clientName = ""; 
    } else {
        clientName = clientName.split(' ')[0]; 
        clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();
    }
    
    const clientPhone = normalizePhone(sender.phone_number || "");
    let userMessage = payload.content || "";

    // 3. DETECÇÃO MULTIMODAL (ÁUDIO/IMAGEM)
    const attachments = payload.attachments || [];
    const mediaAttachment = attachments.find((att: any) => 
        att.file_type === 'audio' || att.file_type === 'image' || 
        att.content_type?.startsWith('audio/') || att.content_type?.startsWith('image/')
    );

    if (mediaAttachment) {
        try {
            const mediaResp = await fetch(mediaAttachment.data_url);
            const mediaBuffer = await mediaResp.arrayBuffer();
            const base64Media = arrayBufferToBase64(mediaBuffer);
            const mimeType = mediaAttachment.content_type || (mediaAttachment.file_type === 'audio' ? 'audio/ogg' : 'image/jpeg');

            let mediaPrompt = "Descreva este arquivo.";
            if (mimeType.startsWith('audio')) {
                mediaPrompt = "Transcreva este áudio fielmente. Se for ruído, diga [RUÍDO].";
            } else if (mimeType.startsWith('image')) {
                mediaPrompt = "Analise esta imagem. Se for um exame, descreva a perda. Se for outra coisa, descreva.";
            }

            const multimodalResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: mediaPrompt },
                                { inline_data: { mime_type: mimeType, data: base64Media } }
                            ]
                        }]
                    })
                }
            );
            const mmData = await multimodalResp.json();
            const analysis = mmData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (analysis) userMessage = `[MÍDIA ENVIADA PELO CLIENTE: ${analysis}] \n ${userMessage}`;
        } catch (err) {
            console.error("❌ Erro Multimodal:", err);
        }
    }

    if (!userMessage || userMessage.trim().length === 0) return new Response('Empty', { status: 200 });

    // 4. BUSCAR HISTÓRICO RECENTE DA CONVERSA (CONTEXTO)
    // Busca as mensagens anteriores para a IA saber o que já foi dito
    const historyResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
        headers: { 'api_access_token': chatwootToken }
    });
    const historyData = await historyResp.json();
    const messages = historyData.payload || [];
    
    // Formata histórico (do antigo para o novo)
    const recentHistory = messages.slice().reverse().slice(-6).map((m: any) => {
        const role = m.message_type === 'incoming' ? 'CLIENTE' : 'CLARA (Assistente Virtual)';
        return `${role}: ${m.content}`;
    }).join("\n");

    // 5. MEMÓRIA RAG (Base de Conhecimento TÉCNICO)
    const embedResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: "models/text-embedding-004", content: { parts: [{ text: userMessage }] } }) }
    );
    const embedData = await embedResp.json();
    let contextText = "";
    if (embedData.embedding) {
        const { data: docs } = await supabase.rpc('match_knowledge', {
            query_embedding: embedData.embedding.values, match_threshold: 0.5, match_count: 2
        });
        contextText = docs?.map(d => `REF TÉCNICA:\nP: ${d.content}\nR: ${d.response}`).join("\n---\n") || "";
    }

    // 6. PROMPT DEFINITIVO (CLARA 7.1 - A ASSISTENTE VIRTUAL)
    const SYSTEM_PROMPT = `
    Você é a Clara, a **Assistente Virtual** da Audicare Aparelhos Auditivos.
    Na saudação, deixe claro que você é uma inteligência artificial, isso é importante para transparência. Após informar na saudação, não se justifique mais como inteligência artificial.
    Seu tom é sempre **educado, profissional, empático e prestativo**. Use linguagem simples e clara.
    Seu objetivo principal é **ajudar o cliente rapidamente**, fornecendo informações úteis e triando o atendimento para a equipe humana quando necessário. Também não precisa usar o termo triagem, você simplesmente atende esse cliente.
    Seja breve e direto ao ponto, evite respostas longas.
    
    CLIENTE: ${clientName || "Desconhecido"}.

    HISTÓRICO RECENTE DA CONVERSA (O QUE JÁ FOI DITO):
    ${recentHistory}
    
    MEMÓRIA TÉCNICA (SEUS TREINAMENTOS):
    ${contextText}

    MENSAGEM ATUAL DO CLIENTE: "${userMessage}"

    ---
    TAREFA: Retornar JSON.
    {
      "sentiment": "NEUTRO" | "POSITIVO" | "IRRITADO" | "CONFUSO",
      "intent": "SAUDACAO" | "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "COMPRA" | "URGENTE_HUMANO",
      "reply": "Sua resposta..."
    }

    REGRAS DE OURO:
    1. **ANTI-REPETIÇÃO:** Olhe o HISTÓRICO. Se você já se apresentou recentemente, NÃO se apresente de novo. Apenas responda.
    2. **ANTI-OFERTA:** NUNCA ofereça "Teste Grátis". Ofereça "Avaliação com a Dra. Karine".
    3. **ÁLIBI:** Se não souber responder ou se o cliente pedir algo complexo (como agendar horário específico), diga: "Já registrei seu pedido e a equipe humana entrará em contato em instantes para confirmar."
    
    ROTEIRO DE RESPOSTA:
    - **Início (Sem histórico):** "Olá ${clientName}, tudo bem? Sou a Clara, assistente virtual da Audicare. Como posso te ajudar?" (Curto e direto).
    - **Triagem (Se o cliente pedir info):** Responda a dúvida e quando possível e se for um cliente novo para a compra de aparelhos auditivos pergunte: "Para adiantar seu atendimento, você já possui audiometria atualizada?"
    - **Agendamento:** "Entendido. Vou encaminhar sua preferência de horário para a secretaria verificar a agenda da Dra. Karine e seguir com seu agendamento."
    `;

    const aiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT }] }] })
      }
    );
    const aiData = await aiResp.json();
    let rawJson = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawJson) throw new Error("IA falhou.");

    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(rawJson);

    // TRATAMENTO DE PÂNICO
    if (result.intent === 'URGENTE_HUMANO' || result.sentiment === 'IRRITADO') {
        await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, {
            method: 'POST',
            headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ labels: ['urgente', 'ia_handover'] })
        });
        if (clientPhone) {
             const searchPhone = clientPhone.slice(-8); 
             const { data: leads } = await supabase.from('leads').select('id').ilike('phone', `%${searchPhone}%`);
             if (leads && leads.length > 0) await supabase.from('leads').update({ status: 'stopped_responding' }).eq('id', leads[0].id);
        }
        return new Response(JSON.stringify({ action: 'handoff' }), { headers: corsHeaders });
    }

    // ENVIO COM DELAY NATURAL
    if (result.reply) {
        const messages = result.reply.split('\n').map(m => m.trim()).filter(m => m.length > 0);
        
        for (const [index, msg] of messages.entries()) {
            const delay = index === 0 ? 3500 : 2000; 
            await new Promise(r => setTimeout(r, delay));

            await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: msg, message_type: 'outgoing', private: false })
            });
        }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("🚨 Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})