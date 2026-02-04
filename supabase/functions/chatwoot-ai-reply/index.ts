
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

// --- FUNÇÃO AUXILIAR: NOTA PRIVADA NO CHATWOOT ---
async function createPrivateNote(url: string, token: string, accountId: number, conversationId: number, content: string) {
    try {
        await fetch(`${url}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, {
            method: 'POST',
            headers: { 'api_access_token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ labels: ['clara_log'] })
        });
    } catch (e) { console.error("Erro ao criar nota:", e); }
}

const MODEL_PRIORITY = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash"
];

// --- EXEMPLOS DE SUCESSO (AGORA COM ENDEREÇO FIXO E REGRA DE LOCAL ÚNICO) ---
const SUCCESS_EXAMPLES = `
EXEMPLO 1: CLIENTE QUER SABER ONDE FICA
Cliente: "Manda a localização."
Atendente: "Estamos localizados na SEPS 714/914 Sul, Edifício Talento, Sala 434 (Asa Sul - Brasília/DF). 📍 ##BREAK## O prédio fica próximo ao hospital Santa Lúcia. Gostaria de agendar sua avaliação?"

EXEMPLO 2: CLIENTE DE OUTRA CIDADE (TRAVA DE FRANQUIA)
Cliente: "Vocês têm loja em Goiânia?"
Atendente: "Nossa unidade é exclusiva em Brasília, na Asa Sul. Não possuímos filiais em outras cidades. ##BREAK## Muitos pacientes de fora vêm se consultar conosco pela qualidade do atendimento. Se tiver disponibilidade de vir a Brasília, será um prazer te receber!"

EXEMPLO 3: CLIENTE QUER AGENDAR
Cliente: "Quero marcar para amanhã às 10h."
Atendente: "Obrigada! Registrei sua preferência para manhã às 10h. ##BREAK## Vou repassar para a equipe confirmar a disponibilidade na agenda oficial e eles te chamam aqui para dar o OK final. [HANDOFF]"

EXEMPLO 4: TRAVANDO ALUCINAÇÃO DE PREÇO
Cliente: "Quanto é?"
Atendente: "Trabalhamos com modelos a partir de R$ 2.500,00, com condições especiais este mês (18x sem juros). ##BREAK## O valor exato depende da avaliação da Dra. Karine. Vamos agendar para você conhecer?"
`;

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    let conversationId: number | null = null;
    let accountId: number | null = null;
    let chatwootUrl: string | null = null;
    let chatwootToken: string | null = null;

    try {
        const payload = await req.json();

        if (payload.message_type !== 'incoming' || payload.private) {
            return new Response('Ignored', { status: 200 });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
        chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';

        const API_KEYS = [
            { name: 'FREE', key: Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY') },
            { name: 'PAID', key: Deno.env.get('GEMINI_API_KEY_PAID') }
        ].filter(k => k.key);

        if (!supabaseUrl || !supabaseKey || !chatwootToken || API_KEYS.length === 0) throw new Error("Configs ausentes.");

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'clara_active').single();
        if (config && config.value === false) return new Response('Clara is OFF', { status: 200 });

        conversationId = payload.conversation.id;
        accountId = payload.account.id;
        const currentMessageId = payload.id;
        const sender = payload.sender || {};

        // ⏳ ZONA DE ESPERA (DEBOUNCE) - 45 SEGUNDOS
        await new Promise(r => setTimeout(r, 45000));

        // --- RE-VALIDAÇÃO ---
        const historyResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
            headers: { 'api_access_token': chatwootToken }
        });
        const historyData = await historyResp.json();
        const messages = historyData.payload || [];

        if (messages.length === 0) return new Response('No messages', { status: 200 });

        const lastMessage = messages[messages.length - 1];

        // 1. CHECK DE DUPLICIDADE
        if (lastMessage.id !== currentMessageId) {
            console.log(`🚫 Abortando: Nova mensagem chegou.`);
            return new Response(JSON.stringify({ aborted: "Debounced" }), { headers: corsHeaders });
        }

        // 2. CHECK DE INTERVENÇÃO HUMANA (TIME-LOCK 30 MIN)
        const lastHumanMsg = messages.slice().reverse().find((m: any) =>
            m.message_type === 'outgoing' && m.sender && (m.sender.type === 'user' || m.sender.type === 'User')
        );

        if (lastHumanMsg) {
            const lastHumanTime = new Date(lastHumanMsg.created_at * 1000).getTime();
            const now = new Date().getTime();
            const diffMinutes = (now - lastHumanTime) / 1000 / 60;

            if (diffMinutes < 30) {
                console.log(`🛑 Abortando: Humano falou há ${diffMinutes.toFixed(0)} min.`);
                return new Response(JSON.stringify({ aborted: "Human active recently" }), { headers: corsHeaders });
            }
        }

        // 3. LIMITE DE MENSAGENS
        if (messages.length > 40) {
            await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, {
                method: 'POST',
                headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: ['urgente', 'loop_infinito'] })
            });
            return new Response(JSON.stringify({ aborted: "Conversation too long" }), { headers: corsHeaders });
        }

        // --- PREPARAÇÃO DO CONTEXTO ---

        let clientName = sender.name || "Cliente";
        if (clientName.match(/^\+?[0-9\s-]+$/) || clientName.toLowerCase() === 'cliente') clientName = "";
        else clientName = clientName.split(' ')[0];
        if (clientName) clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();

        let userMessage = payload.content || "";

        // MÍDIA
        const attachments = payload.attachments || [];
        const mediaAttachment = attachments.find((att: any) => att.file_type === 'audio' || att.file_type === 'image');

        if (mediaAttachment) {
            try {
                const mediaResp = await fetch(mediaAttachment.data_url);
                const mediaBuffer = await mediaResp.arrayBuffer();
                const base64Media = arrayBufferToBase64(mediaBuffer);
                const mimeType = mediaAttachment.content_type || (mediaAttachment.file_type === 'audio' ? 'audio/ogg' : 'image/jpeg');

                const multimodalResp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEYS[0].key}`,
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
            } catch (err) { console.error("Erro Mídia:", err); }
        }

        if (!userMessage || userMessage.trim().length === 0) return new Response('Empty', { status: 200 });

        // --- SYNC LEADS (CRM BRIDGE) ---
        // Adicionado aqui para garantir que o CRM e o Script de Recuperação saibam que houve interação
        let existingLead = null;
        try {
            let clientPhone = sender.phone_number || "";
            clientPhone = clientPhone.replace(/\D/g, '');

            if (clientPhone) {
                const { data } = await supabase.from('leads').select('id, status').eq('phone', clientPhone).maybeSingle();
                existingLead = data;

                if (existingLead) {
                    // Atualiza o timestamp (VACINA para não disparar 'recover-leads' incorretamente)
                    await supabase.from('leads').update({
                        last_message_at: new Date().toISOString(),
                        chatwoot_conversation_id: conversationId,
                        last_message_content: userMessage.substring(0, 200)
                    }).eq('id', existingLead.id);
                } else {
                    // Cria Novo Lead
                    const { data: newLead } = await supabase.from('leads').insert({
                        name: clientName || `Lead ${clientPhone}`,
                        phone: clientPhone,
                        status: 'new',
                        source: 'auto_chatwoot',
                        chatwoot_conversation_id: conversationId,
                        chatwoot_contact_id: sender.id,
                        channel: 'whatsapp',
                        last_message_at: new Date().toISOString(),
                        last_message_content: userMessage.substring(0, 200),
                        clinic_id: 'b82d5019-c04c-47f6-b9f9-673ca736815b'
                    }).select().single();
                    existingLead = newLead;
                }
            }
        } catch (syncErr) { console.error("CRM Sync Error:", syncErr); }


        const hasBotReplied = messages.some((m: any) => m.message_type === 'outgoing');
        const isFirstContact = messages.length <= 2 && !hasBotReplied;

        const recentHistory = messages.slice().reverse().slice(-10).map((m: any) => {
            const role = m.message_type === 'incoming' ? 'CLIENTE' : 'ATENDENTE';
            return `${role}: ${m.content}`;
        }).join("\n");

        // RAG
        let contextText = "";
        try {
            const embedResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEYS[0].key}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: "models/text-embedding-004", content: { parts: [{ text: userMessage }] } }) }
            );
            const embedData = await embedResp.json();

            if (embedData.embedding) {
                const { data: docs } = await supabase.rpc('match_knowledge', {
                    query_embedding: embedData.embedding.values, match_threshold: 0.4, match_count: 3
                });
                // @ts-ignore: Docs
                contextText = docs?.map((d: any) => `INFO TÉCNICA:\nP: ${d.content}\nR: ${d.response}`).join("\n\n") || "";
            }
        } catch (e) { console.error("Sem memória:", e); }

        // =================================================================================
        // 🧠 SYSTEM PROMPT (AGORA COM LOCALIZAÇÃO TRAVADA)
        // =================================================================================
        const SYSTEM_PROMPT = `
    VOCÊ É: Clara, assistente da Audicare (Clínica Única em Brasília).
    EXEMPLOS OBRIGATÓRIOS:
    ${SUCCESS_EXAMPLES}

    CONTEXTO ATUAL:
    - Cliente: ${clientName || "Desconhecido"}
    - Primeiro Contato? ${isFirstContact ? "SIM" : "NÃO"}
    - Info Técnica: ${contextText ? "Sim" : "Não"}
    
    HISTÓRICO RECENTE:
    ${recentHistory}
    
    MENSAGEM NOVA: "${userMessage}"

    🚨 REGRAS DE FERRO (SEGURANÇA):
    1. **LOCALIZAÇÃO ÚNICA:** A Audicare NÃO é franquia. Temos UMA unidade na SEPS 714/914 Sul, Sala 434 (Edifício Talento), em Brasília. NUNCA diga que temos unidades "pelo Brasil" ou peça a cidade do cliente para "achar a mais próxima". Se ele for de fora, diga que atendemos exclusivamente em Brasília.
    2. **INTERRUPÇÃO:** O código já verificou humanos. Mas se notar que já responderam, fique quieta.
    3. **NÃO AGENDE:** Receba preferência e diga: "A equipe vai confirmar."
    4. **LOOP:** Sem "Olá" repetido.
    5. **DIAGNÓSTICO:** Proibido.

    RESPOSTA (JSON):
    {
      "intent": "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "URGENTE_HUMANO",
      "reply": "Sua resposta aqui. Use ##BREAK## para pausas."
    }
    `;

        // CASCATA DE CHAVES
        let aiData = null;
        let usedModel = "";

        keyLoop: for (const apiKeyObj of API_KEYS) {
            for (const modelName of MODEL_PRIORITY) {
                try {
                    const resp = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyObj.key}`,
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

                    if (data.error) {
                        if (data.error.code === 429 || data.error.message.includes('exhausted')) {
                            if (apiKeyObj.name === 'FREE') break;
                        }
                        continue;
                    }

                    aiData = data;
                    usedModel = modelName;
                    break keyLoop;

                } catch (e) { console.error(`Erro ${modelName}`, e); }
            }
        }

        if (!aiData) throw new Error("FALHA TOTAL IA");

        let rawJson = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

        let result;
        try { result = JSON.parse(rawJson); }
        catch (e) { result = { intent: "DUVIDA", reply: rawJson }; }

        // --- AUTO-STAGE MOVEMENT (CRM INTELLIGENCE) ---
        // Mover Cards automaticamente com base na "Intent" da IA
        if (existingLead && existingLead.status !== 'purchased' && existingLead.status !== 'no_purchase') {
            try {
                let newStatus = null;

                // 1. Se IA marcou agendamento -> "scheduled"
                if (result.intent === 'AGENDAMENTO') newStatus = 'scheduled';

                // 2. Se IA marcou Handover ou Urgente -> "new" (Volta pra topo/triagem)
                else if (result.intent === 'URGENTE_HUMANO') newStatus = 'new';

                // 3. Se conversa está fluindo e não é novo -> "in_conversation"
                else if (result.intent === 'TRIAGEM' || result.intent === 'DUVIDA') {
                    if (existingLead.status === 'new') newStatus = 'in_conversation';
                }

                if (newStatus && newStatus !== existingLead.status) {
                    await supabase.from('leads').update({ status: newStatus }).eq('id', existingLead.id);
                    console.log(`[CRM] Lead moved to: ${newStatus}`);
                }
            } catch (crmErr) { console.error("Auto-Stage Error:", crmErr); }
        }


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
                const readingTime = msg.length * 15;
                const delay = index === 0 ? 2000 : Math.min((1500 + readingTime), 5000);
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
        console.error("🚨 CRASH (FALLBACK):", error.message);

        if (chatwootUrl && chatwootToken && conversationId && accountId) {
            try {
                await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                    method: 'POST',
                    headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: "Nossa assistente está indisponível momentaneamente. A equipe humana já foi notificada e te responderá em breve!",
                        message_type: 'outgoing',
                        private: false
                    })
                });
                await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, {
                    method: 'POST',
                    headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ labels: ['erro_ia', 'urgente'] })
                });
            } catch (e) { }
        }

        return new Response(JSON.stringify({ error: "Fallback triggered" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
})