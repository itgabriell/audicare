import { GoogleGenerativeAI } from '@google/generative-ai';

class AIAssistantService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;

    if (this.apiKey) {
      this.initializeAI();
    }
  }

  initializeAI() {
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: this.getSystemContext()
      });
    } catch (error) {
      console.error('Erro ao inicializar Google Generative AI:', error);
    }
  }

  getSystemContext() {
    return `Você é um assistente especializado no sistema Audicare, uma clínica de fonoaudiologia completa.

CONTEXTO DO SISTEMA AUDICARE:
- Sistema de gestão para clínicas de fonoaudiologia
- Tecnologias: React + Vite (frontend), Node.js + Express (backend), Supabase (banco)
- WhatsApp integrado via Evolution API/Uazapi
- Funcionalidades: Pacientes, Agendamentos, CRM, Inbox, Tasks, Automations

FUNCIONALIDADES PRINCIPAIS:
1. GESTÃO DE PACIENTES: Cadastro, histórico, dados pessoais, telefones
2. AGENDAMENTOS: Calendário, horários, lembretes automáticos
3. CRM: Leads, conversas, oportunidades de negócio
4. INBOX: Mensagens WhatsApp integradas, atendimento unificado
5. TASKS: Sistema de tarefas e acompanhamento
6. AUTOMAÇÕES: Workflows via n8n, notificações automáticas

ESTRUTURA TÉCNICA:
- Frontend: React com Material-UI/Berry template
- Backend: Node.js com PM2 em VPS Hostinger
- Banco: PostgreSQL via Supabase com RLS
- WhatsApp: Evolution API para integração
- Deploy: Vercel (frontend), VPS (backend)

PROBLEMAS COMUNS E SOLUÇÕES:
- Erro de autenticação: Verificar chave API do Supabase
- WhatsApp não conecta: Verificar Evolution API e webhooks
- Agendamentos não salvam: Verificar permissões RLS no Supabase
- Mensagens não chegam: Verificar configuração do webhook

DICAS PARA USUÁRIOS:
- Sempre use HTTPS em produção
- Configure RLS policies corretamente
- Monitore logs do PM2 no backend
- Teste webhooks via n8n primeiro

Seja prestativo, técnico quando necessário, mas também explique conceitos complexos de forma simples. Foque em soluções práticas para problemas reais do sistema Audicare.`;
  }

  async askQuestion(question) {
    if (!this.apiKey) {
      throw new Error('Chave da API do Google Gemini não configurada');
    }

    if (!question || question.trim().length === 0) {
      throw new Error('Pergunta não pode estar vazia');
    }

    if (!this.model) {
      this.initializeAI();
      if (!this.model) {
        throw new Error('Falha ao inicializar o modelo de IA');
      }
    }

    try {
      const result = await this.model.generateContent(question);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Nenhuma resposta recebida da IA');
      }

      return text;

    } catch (error) {
      console.error('Erro ao consultar Google Gemini:', error);

      // Tratamento específico de erros
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Chave da API do Google Gemini inválida');
      }
      if (error.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Permissão negada. Verifique se a chave da API tem acesso ao Gemini');
      }
      if (error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Quota da API excedida. Tente novamente mais tarde');
      }

      throw new Error('Erro ao processar pergunta. Tente novamente.');
    }
  }

  // Método para verificar se a API está configurada
  isConfigured() {
    return !!this.apiKey;
  }
}

export const aiAssistantService = new AIAssistantService();
