import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { transcript } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY');

    // Prompt para o Gemini agir como um "Bibliotecário"
    const prompt = `
      Analise a seguinte transcrição de conversa de atendimento em uma clínica de fonoaudiologia.
      Identifique as perguntas importantes feitas pelo cliente e as respostas dadas pelo atendente.
      Ignore saudações ("oi", "bom dia") ou conversas fiadas. Foque em dúvidas técnicas, preços, localização e procedimentos.
      
      Retorne APENAS um JSON (sem markdown) no seguinte formato:
      [
        { "question": "Pergunta do cliente", "answer": "Resposta do atendente" },
        ...
      ]

      Transcrição:
      ${transcript}
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    let rawText = data.candidates[0].content.parts[0].text;
    
    // Limpeza do JSON (caso o Gemini mande ```json ...)
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const pairs = JSON.parse(rawText);

    return new Response(JSON.stringify({ pairs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})