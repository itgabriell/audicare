import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transcript } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("CONFIG_ERROR: GEMINI_API_KEY não encontrada nos Secrets.");
    }

    // --- MUDANÇA DEFINITIVA: Usando o ALIAS que nunca falha ---
    const MODEL_NAME = "gemini-flash-latest"; 
    
    console.log(`📡 Conectando no modelo: ${MODEL_NAME}`);

    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
      Analise a conversa abaixo. Extraia pares de perguntas e respostas.
      Retorne APENAS um JSON puro no formato: [{"question": "...", "answer": "..."}].
      Sem markdown, sem explicações.

      Conversa:
      ${transcript}
    `;

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ Erro Google API:", errorBody);
      throw new Error(`GOOGLE_API_ERROR (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("AI_EMPTY_RESPONSE: A IA não retornou texto.");
    }

    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let pairs;
    try {
      pairs = JSON.parse(cleanJson);
    } catch (e) {
      throw new Error(`JSON_PARSE_ERROR: Texto inválido recebido da IA.`);
    }

    return new Response(JSON.stringify({ pairs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("🚨 ERRO CAPTURADO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})