import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuração de CORS para permitir que seu CRM chame esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Lida com a requisição OPTIONS (Preflight do navegador)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const CHATWOOT_BASE_URL = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';
    const CHATWOOT_API_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN');
    const ACCOUNT_ID = Deno.env.get('CHATWOOT_ACCOUNT_ID') || '2';

    if (!CHATWOOT_API_TOKEN) {
      throw new Error('CHATWOOT_API_TOKEN não configurado nos Secrets');
    }

    console.log("🔄 Buscando conversas no Chatwoot...");

    // Busca as conversas (ordenadas por atividade recente)
    const response = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations?status=all&sort_by=last_activity_at&page=1`,
      {
        method: 'GET',
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro Chatwoot: ${response.status} - ${errText}`);
    }

    const data = await response.json();

    // Retorna os dados para o seu Frontend, com os cabeçalhos de CORS permitindo o acesso
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("❌ Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})