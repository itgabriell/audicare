import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, ''); 
}

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
      return new Response('Ignored (Outgoing/Private)', { status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';

    if (!supabaseUrl || !supabaseKey || !geminiKey || !chatwootToken) throw new Error("Configs ausentes.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- DISJUNTOR ---
    const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'clara_active').single();
    console.log(`🤖 Clara ON/OFF: ${config?.value}`); 
    if (config && config.value === false) return new Response('Clara is OFF', { status: 200 });

    // DADOS DO CLIENTE
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;
    const sender = payload.sender || {};
    let clientName = sender.name || "Cliente";
    
    if (clientName.match(/^\+?[0-9\s-]+$/) || clientName.toLowerCase() === 'cliente') {
        clientName = ""; 
    } else {
        clientName = clientName.split(' ')[0]; 
        clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();
    }
    
    const clientPhone = normalizePhone(sender.phone_number || "");
    let userMessage = payload.content || "";

    // 2. DETECÇÃO MULTIMODAL
    const attachments = payload.attachments || [];
    const mediaAttachment = attachments.find((att: any) => 
        att.file_type === 'audio' || att.file_type === 'image' || 
        att.content_type?.startsWith('audio/') || att.content_type?.startsWith('image/')
    );

    if (mediaAttachment) {
        try {
            console.log("📁 Mídia detectada, analisando...");
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

            // MODELO: Gemini 2.0 Flash (Mais estável que o 2.5)
            const multimodalResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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
            console.log("✅ Análise de mídia concluída.");
        } catch (err) {
            console.error("❌ Erro Multimodal:", err);
        }
    }

    if (!userMessage || userMessage.trim().length === 0) return new Response('Empty', { status: 200 });

    // 3. HISTÓRICO
    const historyResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
        headers: { 'api_access_token': chatwootToken }
    });
    const historyData = await historyResp.json();
    const messages = historyData.payload || [];
    
    const recentHistory = messages.slice().reverse().slice(-6).map((m: any) => {
        const role = m.message_type === 'incoming' ? 'CLIENTE' : 'CLARA (Assistente)';
        return `${role}: ${m.content}`;
    }).join("\n");

    // 4. MEMÓRIA TÉCNICA (RAG)
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

    // 5. CÉREBRO DA CLARA
    const SYSTEM_PROMPT = `
    Você é a Clara, a **Assistente Virtual** da Audicare Aparelhos Auditivos.
    
    CLIENTE: ${clientName || "Desconhecido"}.

    HISTÓRICO RECENTE:
    ${recentHistory}
    
    MEMÓRIA TÉCNICA:
    ${contextText}

    MENSAGEM ATUAL: "${userMessage}"

    ---
    TAREFA: Retornar EXCLUSIVAMENTE um JSON.
    {
      "sentiment": "NEUTRO" | "POSITIVO" | "IRRITADO" | "CONFUSO",
      "intent": "SAUDACAO" | "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "COMPRA" | "URGENTE_HUMANO",
      "reply": "Sua resposta aqui. Seja breve, empática e use emojis."
    }

    REGRAS DE OURO:
    1. ANTI-REPETIÇÃO: Olhe o HISTÓRICO. Se já se apresentou, NÃO repita "Sou a Clara".
    2. ANTI-OFERTA: NUNCA ofereça "Teste Grátis".
    3. ÁLIBI: Se não souber, diga: "Vou registrar sua dúvida e pedir para a equipe humana te responder em breve."
    
    ROTEIRO:
    - Início: "Olá ${clientName}, tudo bem? Sou a Clara, assistente virtual da Audicare. Como posso ajudar?"
    - Triagem: Responda a dúvida e pergunte se já tem audiometria.
    `;

    // MODELO ESTÁVEL: Gemini 2.0 Flash
    const aiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: SYSTEM_PROMPT }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        })
      }
    );
    
    const aiData = await aiResp.json();

    if (aiData.error) {
        console.error("❌ ERRO DA IA:", JSON.stringify(aiData.error));
        
        // Se der erro de cota de novo, avise no log
        if (aiData.error.code === 429) {
             throw new Error("COTA EXCEDIDA: O plano gratuito atingiu o limite.");
        }
        throw new Error(`Gemini Error: ${aiData.error.message}`);
    }

    let rawJson = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawJson) {
        console.error("❌ Resposta Vazia:", JSON.stringify(aiData));
        throw new Error("IA retornou vazio.");
    }

    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let result;
    try {
        result = JSON.parse(rawJson);
    } catch (e) {
        console.warn("⚠️ Falha no Parse JSON, usando texto cru.");
        result = { intent: "DUVIDA", sentiment: "NEUTRO", reply: rawJson };
    }

    if (result.intent === 'URGENTE_HUMANO' || result.sentiment === 'IRRITADO') {
        await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, {
            method: 'POST',
            headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ labels: ['urgente', 'ia_handover'] })
        });
        return new Response(JSON.stringify({ action: 'handoff' }), { headers: corsHeaders });
    }

    if (result.reply) {
        const messages = result.reply.split('\n').map(m => m.trim()).filter(m => m.length > 0);
        
        for (const [index, msg] of messages.entries()) {
            const delay = index === 0 ? 3000 : 2000; 
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
    console.error("🚨 CRASH:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})