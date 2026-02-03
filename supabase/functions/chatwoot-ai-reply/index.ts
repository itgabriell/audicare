
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const MODEL_PRIORITY = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

const SUCCESS_EXAMPLES = `
EXEMPLO 1: ATENDIMENTO NOVO LEAD (PERFEITO)
Cliente: "Olá, vi o anúncio do aparelho."
Atendente: "Olá! Tudo bem? Seja muito bem-vindo à Audicare! 😊 ##BREAK## Me chamo Clara. É um prazer te atender. O aparelho seria para você mesmo ou para um familiar?"
Cliente: "É pro meu pai."
Atendente: "Entendi. E ele já usa algum aparelho hoje ou seria a primeira vez?"
Cliente: "Primeira vez."
Atendente: "Certo! Como é a primeira vez, o ideal é agendarmos uma avaliação gratuita para ele testar nossa tecnologia alemã na prática. Vocês têm preferência por manhã ou tarde?"

EXEMPLO 2: CLIENTE PERGUNTA PREÇO (CONTORNO DE OBJEÇÃO)
Cliente: "Quanto custa o aparelho invisível?"
Atendente: "Olá! Temos diversas linhas com tecnologia alemã. O valor exato depende do grau da perda auditiva, que vemos no exame. ##BREAK## Mas tenho uma ótima notícia: estamos com a Campanha de Carnaval com parcelamento em 18x sem juros e desconto no segundo aparelho! 🎭✨ Vamos agendar para você conhecer sem compromisso?"

EXEMPLO 3: PÓS-VENDA / MANUTENÇÃO
Cliente: "Meu aparelho está apitando."
Atendente: "Poxa, imagino que isso incomode. Geralmente é apenas um ajuste de encaixe ou cera. ##BREAK## Vou pedir para a equipe técnica verificar sua agenda e te chamar aqui para resolvermos isso rapidinho, ok? [HANDOFF]"
`;

serve(async (req: Request) => {
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

        const conversationId = payload.conversation.id;
        const accountId = payload.account.id;
        const sender = payload.sender || {};

        let clientName = sender.name || "Cliente";
        // @ts-ignore: Regex check
        if (clientName.match(/^\+?[0-9\s-]+$/) || clientName.toLowerCase() === 'cliente') clientName = "";
        else clientName = clientName.split(' ')[0];
        if (clientName) clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();

        let userMessage = payload.content || "";

        // RECUPERAR HISTÓRICO
        const historyResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
            headers: { 'api_access_token': chatwootToken }
        });
        const historyData = await historyResp.json();
        const messages = historyData.payload || [];
        const isNewConversation = messages.length <= 2;

        // @ts-ignore: Explicit any for map
        const recentHistory = messages.slice().reverse().slice(-10).map((m: any) => {
            const role = m.message_type === 'incoming' ? 'CLIENTE' : 'ATENDENTE';
            return `${role}: ${m.content}`;
        }).join("\n");

        // PROCESSAMENTO DE MÍDIA
        const attachments = payload.attachments || [];
        // @ts-ignore: Explicit any for find
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
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: mimeType.startsWith('audio') ? "Transcreva este áudio fielmente." : "Descreva esta imagem." },
                                    { inline_data: { mime_type: mimeType, data: base64Media } }
                                ]
                            }]
                        })
                    }
                );
                const mmData = await multimodalResp.json();
                const analysis = mmData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (analysis) userMessage = `[MÍDIA DO CLIENTE: ${analysis}] \n ${userMessage}`;
            } catch (err) {
                console.error("Erro Mídia:", err);
            }
        }

        if (!userMessage || userMessage.trim().length === 0) return new Response('Empty', { status: 200 });

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
                    query_embedding: embedData.embedding.values, match_threshold: 0.4, match_count: 3
                });
                // @ts-ignore: Docs mapping
                contextText = docs?.map((d: any) => `INFORMAÇÃO TÉCNICA:\nP: ${d.content}\nR: ${d.response}`).join("\n\n") || "";
            }
        } catch (e) { console.error("Sem memória:", e); }

        const SYSTEM_PROMPT = `
    VOCÊ É: Clara, assistente da Audicare.
    SUA MISSÃO: Atender como se fosse um dos melhores vendedores da clínica.
    
    Abaixo estão exemplos REAIS de como gostamos de atender. IMITE O ESTILO DELES:
    
    ${SUCCESS_EXAMPLES}

    ---
    
    CONTEXTO TÉCNICO:
    ${contextText}

    CONTEXTO ATUAL:
    - Cliente: ${clientName || "Desconhecido"}
    - Início: ${isNewConversation ? "SIM" : "NÃO"}
    
    HISTÓRICO:
    ${recentHistory}
    
    MENSAGEM: "${userMessage}"

    REGRAS DE OURO:
    1. **Naturalidade:** Use ##BREAK## para separar a saudação do assunto.
    2. **Investigação:** Pergunte se é para ele, se já usa aparelho.
    3. **Objetivo:** AGENDAMENTO.
    4. **Segurança:** Nunca invente dados médicos. Use "URGENTE_HUMANO" se necessário.

    RESPOSTA (JSON):
    {
      "intent": "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "URGENTE_HUMANO",
      "reply": "Sua resposta aqui. Use ##BREAK## para pausas."
    }
    `;

        // --- EXECUÇÃO LLM ---
        let aiData = null;
        let usedModel = "";

        for (const modelName of MODEL_PRIORITY) {
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
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                            ]
                        })
                    }
                );
                const data = await resp.json();
                if (data.error) { console.warn(`Erro modelo ${modelName}:`, data.error.message); continue; }
                aiData = data;
                usedModel = modelName;
                break;
            } catch (e) { console.error(`Erro rede ${modelName}`, e); }
        }

        if (!aiData) throw new Error("Falha na IA");

        let rawJson = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

        let result;
        try { result = JSON.parse(rawJson); }
        catch (e) { result = { intent: "DUVIDA", reply: rawJson }; }

        if (result.intent === 'URGENTE_HUMANO') {
            await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, {
                method: 'POST',
                headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: ['urgente', 'ia_handover'] })
            });
        }

        if (result.reply) {
            const replyMessages = result.reply.split('##BREAK##').map((m: string) => m.trim()).filter((m: string) => m.length > 0);

            for (const [index, msg] of replyMessages.entries()) {
                const delay = index === 0 ? 2000 : (1500 + (msg.length * 15));
                await new Promise(r => setTimeout(r, delay));

                await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                    method: 'POST',
                    headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: msg, message_type: 'outgoing', private: false })
                });
            }
        }

        return new Response(JSON.stringify({ success: true, model: usedModel }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error("🚨 CRASH:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
})