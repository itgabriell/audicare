
// Retiramos o import do 'std' pois usaremos Deno.serve nativo
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

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

// Usando Deno.serve nativo (sem dependência externa)
Deno.serve(async (req: Request) => {
    // 1. Tratamento de CORS (Rápido)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const payload = await req.json();

        // 2. Validação Rápida do Payload
        if (payload.message_type !== 'incoming' || payload.private) {
            return new Response('Ignored', { status: 200, headers: corsHeaders });
        }

        // 3. Resposta Imediata para o Chatwoot (Evita Timeout)
        // O Chatwoot exige 2xx em <10s. Respondemos na hora e processamos em background.
        const responsePromise = new Response(JSON.stringify({ status: 'Processing in background' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

        // 4. Processamento em Background
        const backgroundTask = (async () => {
            let conversationId: number | null = null;
            let accountId: number | null = null;
            let chatwootUrl: string | null = null;
            let chatwootToken: string | null = null;

            try {
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

                // DISJUNTOR (Rápido)
                const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'clara_active').single();
                if (config && config.value === false) {
                    console.log("Clara is OFF via App Settings");
                    return;
                }

                conversationId = payload.conversation.id;
                accountId = payload.account.id;
                const currentMessageId = payload.id;
                const sender = payload.sender || {};

                console.log(`⏳ Iniciando Debounce de 45s para Conv #${conversationId}`);

                // 5. DEBOUNCE (Agora seguro no background)
                await new Promise(r => setTimeout(r, 45000));

                // --- RE-VALIDAÇÃO (Busca histórico novo) ---
                const historyResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
                    headers: { 'api_access_token': chatwootToken }
                });

                if (!historyResp.ok) throw new Error(`Chatwoot API Error: ${historyResp.status}`);

                const historyData = await historyResp.json();
                const messages = historyData.payload || [];

                if (messages.length === 0) return;

                const lastMessage = messages[messages.length - 1];

                // CHECK DE DUPLICIDADE
                if (lastMessage.id !== currentMessageId) {
                    console.log(`🚫 Abortando: Nova mensagem chegou após o delay.`);
                    return;
                }

                // CHECK DE HUMANO
                const lastHumanMsg = messages.slice().reverse().find((m: any) =>
                    m.message_type === 'outgoing' && m.sender && ['user', 'User'].includes(m.sender.type)
                );

                if (lastHumanMsg) {
                    const lastHumanTime = new Date(lastHumanMsg.created_at * 1000).getTime();
                    const now = new Date().getTime();
                    const diffMinutes = (now - lastHumanTime) / 1000 / 60;

                    if (diffMinutes < 30) {
                        console.log(`🛑 Abortando: Humano ativo há ${diffMinutes.toFixed(0)} min.`);
                        return;
                    }
                }

                // LIMITE DE MENSAGENS
                if (messages.length > 40) {
                    await createPrivateNote(chatwootUrl!, chatwootToken!, accountId, conversationId, "Urgente: Loop Infinito Detectado");
                    return;
                }

                // --- LÓGICA CORE (Sync, AI, Reply) ---

                // 1. Preparar Dados
                let clientName = sender.name || "Cliente";
                if (clientName.match(/^\+?[0-9\s-]+$/) || clientName.toLowerCase() === 'cliente') clientName = "";
                else clientName = clientName.split(' ')[0];
                if (clientName) clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1).toLowerCase();

                let userMessage = payload.content || "";

                // 2. Mídia (Multimodal)
                const attachments = payload.attachments || [];
                const mediaAttachment = attachments.find((att: any) => att.file_type === 'audio' || att.file_type === 'image');

                if (mediaAttachment && mediaAttachment.data_url) {
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

                if (!userMessage || !userMessage.trim()) return;

                // 3. CRM Sync
                let existingLead = null;
                try {
                    let clientPhone = sender.phone_number || "";
                    clientPhone = clientPhone.replace(/\D/g, '');

                    if (clientPhone) {
                        const { data } = await supabase.from('leads').select('id, status').eq('phone', clientPhone).maybeSingle();
                        existingLead = data;

                        if (existingLead) {
                            await supabase.from('leads').update({
                                last_message_at: new Date().toISOString(),
                                chatwoot_conversation_id: conversationId,
                                last_message_content: userMessage.substring(0, 200)
                            }).eq('id', existingLead.id);
                        } else {
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

                // 4. RAG & System Prompt
                const hasBotReplied = messages.some((m: any) => m.message_type === 'outgoing');
                const isFirstContact = messages.length <= 2 && !hasBotReplied;

                const recentHistory = messages.slice().reverse().slice(-10).map((m: any) => {
                    const role = m.message_type === 'incoming' ? 'CLIENTE' : 'ATENDENTE';
                    return `${role}: ${m.content}`;
                }).join("\n");

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
                } catch (e) { console.error("Sem memória RAG:", e); }

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

                🚨 REGRAS DE FERRO:
                1. **LOCALIZAÇÃO ÚNICA:** A Audicare NÃO é franquia. Temos UMA unidade na SEPS 714/914 Sul, Sala 434 (Edifício Talento), em Brasília.
                2. **INTERRUPÇÃO:** O código já verificou humanos.
                3. **NÃO AGENDE:** Receba preferência e diga: "A equipe vai confirmar."
                4. **RESUMO:** Seja breve.

                RESPOSTA (JSON):
                {
                    "intent": "TRIAGEM" | "AGENDAMENTO" | "DUVIDA" | "URGENTE_HUMANO",
                    "reply": "Sua resposta aqui. Use ##BREAK## para pausas."
                }
                `;

                // 5. Chamada LLM
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
                                if (data.error.code === 429) { if (apiKeyObj.name === 'FREE') break; }
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

                // 6. Auto-Stage Movement
                if (existingLead && !['purchased', 'no_purchase'].includes(existingLead.status)) {
                    let newStatus = null;
                    if (result.intent === 'AGENDAMENTO') newStatus = 'scheduled';
                    else if (result.intent === 'URGENTE_HUMANO') newStatus = 'new';
                    else if ((result.intent === 'TRIAGEM' || result.intent === 'DUVIDA') && existingLead.status === 'new') {
                        newStatus = 'in_conversation';
                    }

                    if (newStatus && newStatus !== existingLead.status) {
                        await supabase.from('leads').update({ status: newStatus }).eq('id', existingLead.id);
                    }
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

            } catch (error: any) {
                console.error("🚨 CRASH BACKGROUND:", error.message);
                // Tenta avisar no Chatwoot se falhar
                if (chatwootUrl && chatwootToken && conversationId && accountId) {
                    createPrivateNote(chatwootUrl, chatwootToken, accountId, conversationId, `Erro IA: ${error.message}`);
                }
            }
        })();

        // Registra a tarefa para manter a Edge Function viva até terminar
        // @ts-ignore: EdgeRuntime global
        EdgeRuntime.waitUntil(backgroundTask);

        return responsePromise;

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
})