import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { input } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY ausente");

    // Mantendo o 004 que aparece na sua lista.
    const MODEL_NAME = "text-embedding-004";
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:embedContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL_NAME}`,
        content: { parts: [{ text: input }] }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // Se der erro no 004, vamos tentar o fallback automático pro 001
      if(errorBody.includes("not found") || errorBody.includes("404")) {
         console.log("Tentando fallback para embedding-001...");
         // ... (lógica de fallback simplificada: apenas jogue erro para tentarmos manual se precisar)
      }
      throw new Error(`GOOGLE_EMBED_ERROR: ${errorBody}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ embedding: data.embedding.values }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})