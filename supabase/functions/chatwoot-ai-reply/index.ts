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

// LISTA DE MODELOS ROBUSTA (O segredo do sucesso)
const MODEL_PRIORITY = [
    "gemini-2.0-flash-lite-preview-02-05", 
    "gemini-2.0-flash-exp",                 
    "gemini-pro"                            
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json();

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

    // DISJUNTOR
    const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'clara_active').single();
    if (config && config.value === false) return new Response('Clara is OFF', { status: 200 });

    // DADOS CLIENTE
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;
    const sender = payload.sender || {};
    let clientName = sender.name || "Cliente";
    if (clientName.match(/^\+?[0-9\s-]+$/) || clientName.toLowerCase() === 'cliente') clientName = ""; 
    else clientName = clientName.split(' ')[0]; 
    if(clientName) clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();
    
    let userMessage = payload.content || "";

    // MÍDIA
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

            const multimodalResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: mimeType.startsWith('audio') ? "Transcreva este áudio fielmente. Se for ruído, diga [RUÍDO]." : "Descreva esta imagem para fins de audiologia/atendimento." },
                                { inline_data: { mime_type: mimeType, data: base64Media } }
                            ]
                        }]
                    })
                }
            );
            const mmData = await multimodalResp.json();
            const analysis = mmData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (analysis) userMessage = `[ARQUIVO DE MÍDIA ENVIADO PELO CLIENTE: ${analysis}] \n ${userMessage}`;
        } catch (err) {
            console.error("Erro Mídia:", err);
        }
    }

    if (!userMessage || userMessage.trim().length === 0) return new Response('Empty', { status: 200 });

    // HISTÓRICO
    const historyResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
        headers: { 'api_access_token': chatwootToken }
    });
    const historyData = await historyResp.json();
    const messages = historyData.payload || [];
    const recentHistory = messages.slice().reverse().slice(-6).map((m: any) => {
        const role = m.message_type === 'incoming' ? 'CLIENTE' : 'CLARA (Assistente)';
        return `${role}: ${m.content}`;
    }).join("\n");

    // MEMÓRIA TÉCNICA (RAG)
    let contextText = "";
    try {
        const embedResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: "models/text-embedding-004", content: { parts: [{ text: userMessage }] } }) }
        );
        const embedData = await embedResp.json();
        if (embedData.embedding) {
            const { data: docs } = await supabase.rpc('match_knowledge', {
                query_embedding: embedData.embedding.values, match_threshold: 0.5, match_count: 2
            });
            contextText = docs?.map(d => `INFORMAÇÃO DA BASE DE CONHECIMENTO:\nPERGUNTA: ${d.content}\nRESPOSTA CORRETA: ${d.response}`).join("\n---\n") || "";
        }
    } catch (e) { console.error("Sem memória:", e); }

    // =================================================================================
    // 🧠 CÉREBRO DA CLARA (PROMPT TREINADO RESTAURADO)
    // =================================================================================
    const SYSTEM_PROMPT = `
    IDENTIDADE:
    Você é a Clara, a assistente virtual oficial da clínica Audicare.
    Sua persona é: Empática, Profissional, Eficiente e Acolhedora.
    Você age como uma secretária humana experiente no WhatsApp.
    Na saudação você informa que é uma assistente virtual, mas NÃO repete isso mais de uma vez na conversa. 

    CONTEXTO ATUAL:
    - Cliente: ${clientName || "Não identificado ainda"}
    - Histórico Recente da Conversa:
    ${recentHistory}
    
    - Base de Conhecimento (RAG - Use se a pergunta for técnica):
    ${contextText}

    - Mensagem Nova do Cliente: "${userMessage}"

    DIRETRIZES DE COMPORTAMENTO (IMPORTANTE):
    1. **ANTI-REPETIÇÃO:** Verifique o Histórico Recente. Se você (Clara) JÁ SE APRESENTOU nas últimas mensagens, NÃO repita "Sou a Clara" ou "Assistente virtual". Apenas continue a conversa naturalmente.
    2. **TOM DE VOZ:** Use linguagem natural de WhatsApp (pode usar emojis com moderação, quanto menos melhor. 👂✨). Evite textos longos e robóticos. Seja breve.
    3. **ANTI-OFERTA:** NUNCA ofereça "Teste Grátis" ou "Aparelho Grátis". Se perguntarem preço, diga que varia conforme a audiometria e convide para avaliação.
    4. **ÁLIBI (ESCALONAMENTO):** Se o cliente perguntar algo médico complexo, técnico demais que não esteja na Base de Conhecimento, ou parecer irritado, diga: "Vou registrar essa questão para a Dra. Karine e nossa equipe humana te retorna em breve."
    5. **FLUXO DE TRIAGEM:**
       - Se for **Novo Lead**: Pergunte gentilmente como pode ajudar e se já usa aparelho auditivo.
       - Se for **Agendamento**: Pergunte se prefere "manhã ou tarde" e não ofereça horários específicos, quem faz isso é a equipe humana que irá verificar manualmente a agenda disponível e oferecer para o paciente. Quando perceber que a equipe humana já respondeu, abandone esta conversa e pare de responder, a partir daí, a equipe humana assume.
       - Se for **Urgente/Humano**: Identifique se o cliente está irritado, confuso ou exige falar com um humano. Nesse caso, sinalize para a equipe humana com as labels "urgente" e "ia_handover" e informe que um humano entrará em contato. 
       - Se for **Dúvida**: Responda baseada na Base de Conhecimento, não invente respostas, siga a base de conhecimento, caso não encontre informe que vai pedir para o agente humano responder. 
    
    TAREFA:
    Analise a mensagem e retorne EXCLUSIVAMENTE um JSON neste formato:
    {
      "sentiment": "NEUTRO" | "POSITIVO" | "IRRITADO" | "CONFUSO",
      "intent": "SAUDACAO" | "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "URGENTE_HUMANO",
      "reply": "Sua resposta textual aqui (o que será enviado no WhatsApp)"
    }
    `;

    // --- FALLBACK LOOP (A Mecânica Robusta) ---
    let aiData = null;
    let usedModel = "";

    for (const modelName of MODEL_PRIORITY) {
        console.log(`🔄 Tentando modelo: ${modelName}...`);
        try {
            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
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
            const data = await resp.json();

            if (data.error) {
                console.warn(`❌ Falha no modelo ${modelName}: ${data.error.message}`);
                continue; 
            }
            
            aiData = data;
            usedModel = modelName;
            break; 
        } catch (e) {
            console.error(`Erro de rede no modelo ${modelName}`, e);
        }
    }

    if (!aiData || !aiData.candidates) {
        throw new Error("TODOS os modelos falharam.");
    }

    console.log(`✅ Respondido via: ${usedModel}`);

    let rawJson = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) throw new Error("Resposta Vazia");

    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let result;
    try {
        result = JSON.parse(rawJson);
    } catch (e) {
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
            await new Promise(r => setTimeout(r, index === 0 ? 3000 : 2000));
            await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: msg, message_type: 'outgoing', private: false })
            });
        }
    }

    return new Response(JSON.stringify({ success: true, model: usedModel }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("🚨 CRASH FINAL:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})