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
    console.log("🚀 Iniciando extract-knowledge (Usando Gemini 2.0 Flash)...");

    const { transcript } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');

    if (!GEMINI_API_KEY) throw new Error("API Key configuration missing");

    const prompt = `
      Você é um analista de dados de CRM.
      Analise a transcrição abaixo. Extraia pares de "Perguntas do Cliente" e "Respostas do Atendente".
      Ignore saudações. Foque em informações úteis.
      
      IMPORTANTE: Retorne APENAS um JSON válido. Não use crases (\`\`\`).
      Formato: [{"question": "...", "answer": "..."}]

      Transcrição:
      ${transcript}
    `;

    // --- MUDANÇA: Usando o modelo Gemini 2.0 Flash da sua lista ---
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro Google:", errorText);
        throw new Error(`Google API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Ajuste para estrutura do Gemini 2.0 (que é similar, mas garantindo)
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("Empty response from AI");
    
    // Limpeza do JSON
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const pairs = JSON.parse(rawText);

    return new Response(JSON.stringify({ pairs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("🚨 ERRO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})