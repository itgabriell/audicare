import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Helper: Normalizar Telefone
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, ''); 
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json();

    if (payload.message_type !== 'incoming' || payload.private) {
      return new Response('Ignored', { status: 200 });
    }

    // --- CONFIGURAÇÃO DE HORÁRIO ---
    // Ative removendo os comentários /* */ se quiser que ela durma durante o dia
    /*
    const now = new Date();
    const utcHour = now.getUTCHours(); 
    const utcMinutes = now.getUTCMinutes();
    let brHour = utcHour - 3;
    if (brHour < 0) brHour += 24;
    const isBusinessHour = (brHour > 8 || (brHour === 8 && utcMinutes >= 30)) && brHour < 17;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    if (isBusinessHour && !isWeekend) return new Response('Business Hours', { status: 200 });
    */

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';

    if (!supabaseUrl || !supabaseKey || !geminiKey || !chatwootToken) throw new Error("Configs ausentes.");

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Dados do Cliente
    const sender = payload.sender || {};
    let clientName = sender.name || "Cliente";
    if (clientName.match(/^\+?[0-9\s-]+$/)) clientName = ""; 
    else clientName = clientName.split(' ')[0]; // Primeiro nome capitalizado
    if(clientName) clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();
    
    const clientPhone = normalizePhone(sender.phone_number || "");
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;
    
    let userMessage = payload.content || "";

    // =================================================================================
    // 👁️ & 👂 DETECÇÃO MULTIMODAL (ÁUDIO E IMAGEM)
    // =================================================================================
    const attachments = payload.attachments || [];
    const mediaAttachment = attachments.find((att: any) => 
        att.file_type === 'audio' || att.file_type === 'image' || 
        att.content_type?.startsWith('audio/') || att.content_type?.startsWith('image/')
    );

    if (mediaAttachment) {
        console.log(`📎 Mídia detectada: ${mediaAttachment.file_type}`);
        try {
            const mediaResp = await fetch(mediaAttachment.data_url);
            const mediaBuffer = await mediaResp.arrayBuffer();
            const base64Media = arrayBufferToBase64(mediaBuffer);
            const mimeType = mediaAttachment.content_type || (mediaAttachment.file_type === 'audio' ? 'audio/ogg' : 'image/jpeg');

            let mediaPrompt = "Descreva este arquivo.";
            if (mimeType.startsWith('audio')) {
                mediaPrompt = "Transcreva este áudio fielmente. Se for ruído, diga [RUÍDO].";
            } else if (mimeType.startsWith('image')) {
                mediaPrompt = "Analise esta imagem. Se for um exame de audiometria, descreva a perda auditiva. Se for um aparelho, descreva o modelo. Se for outra coisa, descreva o que vê.";
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

            if (analysis) {
                userMessage = `[O CLIENTE ENVIOU UM ARQUIVO DE MÍDIA. CONTEÚDO: ${analysis}] \n ${userMessage}`;
            }
        } catch (err) {
            console.error("❌ Erro Multimodal:", err);
        }
    }

    if (!userMessage || userMessage.trim().length === 0) return new Response('Empty', { status: 200 });

    // =================================================================================
    // 🧠 RAG (MEMÓRIA)
    // =================================================================================
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
        contextText = docs?.map(d => `REF:\nP: ${d.content}\nR: ${d.response}`).join("\n---\n") || "";
    }

    // =================================================================================
    // 🤖 CLARA 6.0 (COM INTELIGÊNCIA SOCIAL)
    // =================================================================================
    
    const SYSTEM_PROMPT = `
    Você é a Clara, da Audicare.
    CLIENTE: ${clientName || "Desconhecido"}.
    
    CONTEXTO DE MEMÓRIA (Use apenas se relevante):
    ${contextText}
    
    MENSAGEM DO CLIENTE: "${userMessage}"

    ---
    SUA TAREFA: RETORNAR UM JSON ESTRUTURADO.
    {
      "sentiment": "NEUTRO" | "POSITIVO" | "IRRITADO" | "CONFUSO",
      "intent": "SAUDACAO" | "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "COMPRA" | "URGENTE_HUMANO",
      "reply": "Sua resposta..."
    }

    ROTEIRO DE RESPOSTA (IMPORTANTE):
    
    1. CENÁRIO "SAUDACAO" (Cliente disse apenas "Oi", "Boa noite", "Tudo bem?"):
       - NÃO fale de audiometria ainda.
       - Responda: "Olá ${clientName ? clientName : ""}, [saudação de acordo com horário]! Tudo ótimo por aqui. Eu sou a Clara, da Audicare. Como posso te ajudar hoje?"

    2. CENÁRIO "TRIAGEM/DUVIDA" (Cliente pediu informação, preço ou disse o que quer):
       - Acolha a dúvida.
       - Apresente brevemente a tecnologia (alemã/suíça/bluetooth).
       - Só ENTÃO pergunte: "Para começarmos a entender seu caso: você já tem o exame de Audiometria atualizado?"

    3. CENÁRIO "URGENTE_HUMANO":
       - Deixe "reply" vazio ("").

    REGRAS GERAIS:
    - Não use "Grátis", use "Sem Custo".
    - Quebre linhas para simular pausas no WhatsApp.
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

    console.log("🤖 DECISÃO:", result);

    // 1. PÂNICO
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

    // 2. KANBAN (Automação)
    if (['AGENDAMENTO', 'COMPRA'].includes(result.intent) && clientPhone) {
         const searchPhone = clientPhone.slice(-8);
         const { data: leads } = await supabase.from('leads').select('id').ilike('phone', `%${searchPhone}%`);
         
         let newStatus = 'in_conversation';
         if (result.intent === 'AGENDAMENTO') newStatus = 'scheduled';
         if (result.intent === 'COMPRA') newStatus = 'likely_purchase';

         if (leads && leads.length > 0) await supabase.from('leads').update({ status: newStatus }).eq('id', leads[0].id);
    }

    // 3. ENVIO DA RESPOSTA
    if (result.reply) {
        const messages = result.reply.split('\n').map(m => m.trim()).filter(m => m.length > 0);
        
        for (const [index, msg] of messages.entries()) {
            const delay = index === 0 ? 5000 : 3000;
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