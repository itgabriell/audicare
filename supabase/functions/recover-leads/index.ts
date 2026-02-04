
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';
    const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    const accountId = '1';

    if (!supabaseUrl || !supabaseKey || !chatwootToken || !geminiKey) throw new Error("Configs ausentes.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Calcular Data de Corte (ex: 24h atrás)
    const hoursSilence = 24;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursSilence);

    console.log(`🔍 Buscando leads sem resposta desde: ${cutoffDate.toISOString()}`);

    // 2. Buscar Leads "Fantasmas" no Supabase
    // Status elegíveis: 'new', 'in_conversation'
    // Ignorar: 'scheduled', 'purchased', 'archived', 'stopped_responding'
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .in('status', ['new', 'in_conversation'])
      .lt('last_message_at', cutoffDate.toISOString())
      .not('chatwoot_conversation_id', 'is', null)
      .limit(20); // Processar em lotes pequenos para evitar timeout

    if (error) throw error;
    if (!leads || leads.length === 0) return new Response(JSON.stringify({ message: "Nenhum lead para recuperar." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const processed = [];

    for (const lead of leads) {
      const convId = lead.chatwoot_conversation_id;

      // 3. Verificar status real no Chatwoot (Labels / Status)
      const cwResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${convId}`, {
        headers: { 'api_access_token': chatwootToken }
      });
      if (!cwResp.ok) continue;

      const convData = await cwResp.json();
      const labels = convData.payload?.labels || [];
      const currentStatus = convData.payload?.status;

      // Vacina: Se já enviamos recuperação ou se já foi finalizado
      if (labels.includes('recuperacao_enviada') || labels.includes('urgente') || labels.includes('fechado') || currentStatus === 'resolved') {
        continue;
      }

      // 4. Verificar Última Mensagem (Quem falou por último?)
      const msgResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${convId}/messages`, {
        headers: { 'api_access_token': chatwootToken }
      });
      const msgData = await msgResp.json();
      const messages = msgData.payload || [];

      if (messages.length === 0) continue;
      const lastMsg = messages[messages.length - 1];

      // Se a última mensagem foi do Cliente, nós que devemos resposta -> Não é caso de recuperação, é FALHA nossa.
      // (Futuramente podemos criar um alerta para isso). Por enquanto, ignora.
      if (lastMsg.message_type === 'incoming') continue;

      // 5. Gerar Mensagem Inteligente com Gemini
      const recentHistory = messages.slice(-5).map((m: any) => `${m.message_type === 'incoming' ? 'Cliente' : 'Atendente'}: ${m.content}`).join('\n');
      const firstName = lead.name.split(' ')[0];

      const prompt = `
            CONTEXTO: Você é Clara, assistente da Audicare.
            O cliente ${firstName} parou de responder há mais de 24h.
            
            HISTÓRICO RECENTE:
            ${recentHistory}
            
            TAREFA: Escreva uma mensagem curta (máx 15 palavras) e amigável para tentar retomar a conversa.
            Não seja insistente demais. Mostre preocupação ou ofereça ajuda.
            Exemplos: "Olá ${firstName}, ficou alguma dúvida sobre o modelo?", "Ei ${firstName}, conseguiu pensar na nossa proposta?", "Olá! Ainda tem interesse na avaliação?"
            
            Responda APENAS o texto da mensagem.
            `;

      const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const aiJson = await aiResp.json();
      let recoveryText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Olá ${firstName}, tudo bem? Ficou alguma dúvida?`;

      // Limpeza básica
      recoveryText = recoveryText.replace(/"/g, '');

      // 6. Enviar Mensagem
      await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: recoveryText, message_type: 'outgoing', private: false })
      });

      // 7. Marcar como Enviado (Label + CRM Update)
      await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${convId}/labels`, {
        method: 'POST',
        headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: [...labels, 'recuperacao_enviada'] })
      });

      // Opcional: Atualizar status lead para 'stopped_responding' (ou deixar em 'in_conversation' até responder?)
      // O user sugeriu "Os que pararam de responder..."
      // Vamos manter o status, mas a label no chatwoot previne spam.

      processed.push({ id: convId, name: lead.name, msg: recoveryText });
      console.log(`✅ Recuperação enviada para ${lead.name}`);

      await new Promise(r => setTimeout(r, 1500)); // Delay
    }

    return new Response(JSON.stringify({ success: true, processed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("🚨 Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})