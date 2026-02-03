import axios from 'axios';
import { supabase } from '@/lib/customSupabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';

// Prompt simplificado para o Assistente Interno (Staff)
const INTERNAL_SYSTEM_PROMPT = `
Você é um assistente interno da clínica Audicare.
Seu objetivo é ajudar a equipe com dúvidas sobre procedimentos, preços e informações técnicas.
Use a Base de Conhecimento para responder. Se não souber, diga que não encontrou a informação.
Seja direto e técnico.
`.trim();

class AIAssistantService {

  /**
   * Realiza uma pergunta ao assistente (Uso Interno - AIAssistant.jsx)
   * @param {string} query - Pergunta do usuário
   * @returns {Promise<string>} - Resposta da IA
   */
  async askQuestion(query) {
    if (!GEMINI_API_KEY) {
      throw new Error('Chave da API Gemini não configurada.');
    }

    try {
      // 1. RAG: Buscar Contexto
      const context = await this.getKnowledgeContext(query);

      // 2. Montar Prompt
      const fullPrompt = `
      ${INTERNAL_SYSTEM_PROMPT}
      
      BASE DE CONHECIMENTO:
      ${context}
      
      PERGUNTA DO USUÁRIO:
      ${query}
      `;

      // 3. Chamada Gemini
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await axios.post(url, {
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3 // Mais preciso para uso interno
        }
      });

      if (!response.data.candidates || response.data.candidates.length === 0) {
        return "Não consegui gerar uma resposta.";
      }

      return response.data.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error('[AIAssistantService] Erro:', error);
      throw new Error('Falha ao consultar a IA.');
    }
  }

  /**
   * Gera Embedding e Busca na Base de Conhecimento (Método Auxiliar)
   */
  async getKnowledgeContext(query) {
    try {
      if (!query) return "";

      // Opção A: API Direta (Frontend Key)
      const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
      const { data } = await axios.post(embedUrl, {
        model: "models/text-embedding-004",
        content: { parts: [{ text: query }] }
      });

      const embedding = data.embedding.values;

      const { data: docs, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 3
      });

      if (error) {
        console.error("Erro Supabase RPC:", error);
        return "";
      }

      if (!docs || docs.length === 0) return "Nenhuma informação relevante encontrada na base.";

      return docs.map(d => `P: ${d.content}\nR: ${d.response}`).join('\n---\n');

    } catch (e) {
      console.error('Erro RAG:', e);
      return "";
    }
  }
}

export const aiAssistantService = new AIAssistantService();
