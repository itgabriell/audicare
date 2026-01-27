import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // --- CONFIGURAÇÕES ---
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';
    const accountId = '1'; // Geralmente é 1, verifique se sua conta Chatwoot é diferente
    
    // Horas de silêncio para considerar "Fantasma" (ex: 24h)
    const HOURS_SILENCE = 24; 
    
    // Mensagem de Resgate (Genérica e Acolhedora)
    const RECOVERY_MESSAGE = (name: string) => 
        `Olá ${name}, tudo bem? Vi que não continuamos nossa conversa ontem. Ficou alguma dúvida ou gostaria de retomar seu atendimento? Estou por aqui!`;

    if (!chatwootToken) throw new Error("CHATWOOT_API_TOKEN ausente.");

    // 1. Buscar conversas ABERTAS (Pending/Open) no Chatwoot
    const resp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations?status=open&sort_by=last_activity_at&sort_order=asc`, {
        headers: { 'api_access_token': chatwootToken }
    });
    
    const data = await resp.json();
    const conversations = data.data?.payload || [];
    
    const processed = [];
    const now = new Date();

    console.log(`🔍 Analisando ${conversations.length} conversas abertas...`);

    for (const conv of conversations) {
        // --- FILTRO 1: TEMPO DE SILÊNCIO ---
        const lastActivity = new Date(conv.last_activity_at * 1000); // Chatwoot usa timestamp unix
        const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

        if (diffHours < HOURS_SILENCE) continue; // Muito recente, pula.

        // --- FILTRO 2: VACINA (Já mandamos?) ---
        const labels = conv.labels || [];
        if (labels.includes('recuperacao_enviada') || labels.includes('urgente') || labels.includes('fechado')) {
            continue; // Já foi tratado.
        }

        // --- FILTRO 3: QUEM FALOU POR ÚLTIMO? ---
        // Precisamos pegar as mensagens para saber quem falou por último.
        // Se a última msg for 'incoming' (do cliente), NÃO mandamos follow-up (nós que estamos devendo resposta).
        // Se a última msg for 'outgoing' (nossa), e ele não respondeu, aí SIM é follow-up.
        
        // Pega a última mensagem (Chatwoot retorna na lista de conversas geralmente, ou buscamos detalhe)
        // A lista de conversas tem 'meta.sender'. Vamos verificar.
        // Vamos fazer uma chamada leve para ver as mensagens apenas se passar nos filtros anteriores
        const msgResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conv.id}/messages`, {
            headers: { 'api_access_token': chatwootToken }
        });
        const msgData = await msgResp.json();
        const messages = msgData.payload || [];
        
        if (messages.length === 0) continue;

        const lastMsg = messages[messages.length - 1]; // Geralmente a última é a mais recente
        
        // Se a última mensagem foi do Cliente (incoming), ignoramos.
        if (lastMsg.message_type === 'incoming') continue;

        // --- AÇÃO: DISPARAR RESGATE ---
        
        // Pegar nome do cliente
        let clientName = conv.meta?.sender?.name || "Cliente";
        if (clientName.match(/^\+?[0-9\s-]+$/)) clientName = ""; // Remove se for só número
        else clientName = clientName.split(' ')[0]; // Só o primeiro nome

        const messageToSend = RECOVERY_MESSAGE(clientName);

        // 1. Enviar Mensagem
        await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conv.id}/messages`, {
            method: 'POST',
            headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: messageToSend, message_type: 'outgoing', private: false })
        });

        // 2. Adicionar Etiqueta (Vacina)
        await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conv.id}/labels`, {
            method: 'POST',
            headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ labels: [...labels, 'recuperacao_enviada'] })
        });

        processed.push({ id: conv.id, name: clientName });
        console.log(`✅ Recuperação enviada para ${clientName} (Conv #${conv.id})`);
        
        // Pausa de segurança para não floodar a API
        await new Promise(r => setTimeout(r, 1000));
    }

    return new Response(JSON.stringify({ 
        success: true, 
        processed_count: processed.length, 
        details: processed 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("🚨 Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})