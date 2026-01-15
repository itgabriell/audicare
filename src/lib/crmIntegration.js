import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Sistema de integração com CRM
export class CRMIntegrationManager {
  constructor() {
    this.crmData = new Map();
    this.patientProfiles = new Map();
    this.leadStatuses = new Map();
    this.opportunities = new Map();
  }

  // Mapeamento de status de lead
  get leadStatusMap() {
    return {
      'novo': { label: 'Novo Lead', color: 'blue', priority: 1 },
      'contatado': { label: 'Contatado', color: 'yellow', priority: 2 },
      'qualificado': { label: 'Qualificado', color: 'green', priority: 3 },
      'proposta': { label: 'Proposta Enviada', color: 'purple', priority: 4 },
      'negociacao': { label: 'Em Negociação', color: 'orange', priority: 5 },
      'fechado_ganho': { label: 'Fechado Ganho', color: 'green', priority: 6 },
      'fechado_perdido': { label: 'Fechado Perdido', color: 'red', priority: 7 },
      'atendendo': { label: 'Em Atendimento', color: 'blue', priority: 2 },
      'agendado': { label: 'Agendado', color: 'green', priority: 3 },
      'finalizado': { label: 'Finalizado', color: 'gray', priority: 8 }
    };
  }

  // Carregar dados do CRM para uma conversa
  async loadConversationCRMData(conversationId) {
    try {
      // Buscar dados do paciente/contato
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          id,
          contact_id,
          lead_status,
          created_at,
          updated_at,
          contact:contacts(
            id,
            name,
            phone,
            email,
            date_of_birth,
            address,
            medical_history,
            insurance_info,
            emergency_contact,
            notes
          )
        `)
        .eq('id', conversationId)
        .single();

      if (!conversation) return null;

      // Buscar histórico médico se for paciente
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('contact_id', conversation.contact_id)
        .maybeSingle();

      // Buscar agendamentos futuros
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('contact_id', conversation.contact_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      // Buscar histórico de mensagens para análise
      const { data: messages } = await supabase
        .from('messages')
        .select('content, direction, created_at, message_type')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Calcular métricas de engajamento
      const engagementMetrics = this.calculateEngagementMetrics(messages);

      const crmData = {
        conversation: conversation,
        patient: patientData,
        appointments: appointments || [],
        engagementMetrics,
        leadScore: this.calculateLeadScore(conversation, messages, appointments),
        recommendedActions: this.generateRecommendedActions(conversation, patientData, appointments)
      };

      // Cache local
      this.crmData.set(conversationId, crmData);

      return crmData;

    } catch (error) {
      console.error('[CRMIntegration] Erro ao carregar dados CRM:', error);
      throw error;
    }
  }

  // Calcular métricas de engajamento
  calculateEngagementMetrics(messages) {
    if (!messages || messages.length === 0) {
      return {
        totalMessages: 0,
        responseRate: 0,
        avgResponseTime: 0,
        lastActivity: null,
        engagementLevel: 'none'
      };
    }

    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.direction === 'outbound');
    const contactMessages = messages.filter(m => m.direction === 'inbound');

    // Calcular taxa de resposta
    const responseRate = userMessages.length > 0 ?
      (contactMessages.length / userMessages.length) * 100 : 0;

    // Calcular tempo médio de resposta (simplificado)
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      const current = messages[i];
      const previous = messages[i - 1];

      if (current.direction === 'inbound' && previous.direction === 'outbound') {
        const responseTime = new Date(current.created_at) - new Date(previous.created_at);
        if (responseTime > 0 && responseTime < 24 * 60 * 60 * 1000) { // Menos de 24h
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Determinar nível de engajamento
    let engagementLevel = 'low';
    if (responseRate > 70 && avgResponseTime < 2 * 60 * 60 * 1000) { // 2 horas
      engagementLevel = 'high';
    } else if (responseRate > 40 || totalMessages > 10) {
      engagementLevel = 'medium';
    }

    return {
      totalMessages,
      userMessages: userMessages.length,
      contactMessages: contactMessages.length,
      responseRate: Math.round(responseRate),
      avgResponseTime,
      lastActivity: messages[0]?.created_at,
      engagementLevel
    };
  }

  // Calcular score do lead
  calculateLeadScore(conversation, messages, appointments) {
    let score = 0;
    const statusMap = this.leadStatusMap;

    // Score baseado no status do lead
    const status = conversation.lead_status || 'novo';
    score += (statusMap[status]?.priority || 1) * 10;

    // Score baseado no engajamento
    const engagement = this.calculateEngagementMetrics(messages);
    switch (engagement.engagementLevel) {
      case 'high': score += 30; break;
      case 'medium': score += 15; break;
      case 'low': score += 5; break;
    }

    // Score baseado em agendamentos
    if (appointments && appointments.length > 0) {
      score += Math.min(appointments.length * 15, 45); // Máximo 45 pontos
    }

    // Score baseado na idade da conversa
    const conversationAge = Date.now() - new Date(conversation.created_at);
    const daysOld = conversationAge / (1000 * 60 * 60 * 24);

    if (daysOld < 7) score += 10; // Conversas recentes
    else if (daysOld < 30) score += 5;

    // Score baseado em dados do contato
    const contact = conversation.contact;
    if (contact?.email) score += 5;
    if (contact?.date_of_birth) score += 5;
    if (contact?.medical_history) score += 10;

    return Math.min(score, 100); // Máximo 100 pontos
  }

  // Gerar ações recomendadas
  generateRecommendedActions(conversation, patientData, appointments) {
    const actions = [];
    const status = conversation.lead_status || 'novo';
    const engagement = this.calculateEngagementMetrics(conversation.messages || []);

    // Ações baseadas no status
    switch (status) {
      case 'novo':
        actions.push({
          type: 'send_greeting',
          priority: 'high',
          title: 'Enviar saudação personalizada',
          description: 'Cumprimente o paciente e demonstre interesse'
        });
        break;

      case 'contatado':
        actions.push({
          type: 'qualify_lead',
          priority: 'high',
          title: 'Qualificar o lead',
          description: 'Colete informações sobre necessidades e preferências'
        });
        break;

      case 'qualificado':
        if (!appointments || appointments.length === 0) {
          actions.push({
            type: 'schedule_appointment',
            priority: 'high',
            title: 'Agendar consulta',
            description: 'Proponha datas disponíveis para atendimento'
          });
        }
        break;

      case 'agendado':
        actions.push({
          type: 'send_reminder',
          priority: 'medium',
          title: 'Enviar lembrete',
          description: 'Confirme o agendamento e forneça instruções'
        });
        break;
    }

    // Ações baseadas no engajamento
    if (engagement.engagementLevel === 'low' && engagement.totalMessages > 5) {
      actions.push({
        type: 're_engage',
        priority: 'medium',
        title: 'Reengajar paciente',
        description: 'Envie mensagem para retomar o contato'
      });
    }

    // Ações baseadas em dados faltantes
    const contact = conversation.contact;
    if (!contact?.email) {
      actions.push({
        type: 'collect_email',
        priority: 'low',
        title: 'Coletar email',
        description: 'Solicite endereço de email para comunicações'
      });
    }

    if (!patientData && contact) {
      actions.push({
        type: 'create_patient_record',
        priority: 'medium',
        title: 'Criar ficha do paciente',
        description: 'Registre informações médicas e pessoais'
      });
    }

    return actions;
  }

  // Atualizar status do lead
  async updateLeadStatus(conversationId, newStatus, notes = '') {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          lead_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;

      // Registrar mudança de status
      await supabase
        .from('lead_status_history')
        .insert({
          conversation_id: conversationId,
          old_status: data.lead_status,
          new_status: newStatus,
          notes,
          changed_at: new Date().toISOString()
        });

      // Limpar cache
      this.crmData.delete(conversationId);

      return data;

    } catch (error) {
      console.error('[CRMIntegration] Erro ao atualizar status:', error);
      throw error;
    }
  }

  // Criar oportunidade
  async createOpportunity(conversationId, opportunityData) {
    try {
      const opportunity = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        ...opportunityData,
        status: 'open',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('opportunities')
        .insert([opportunity])
        .select()
        .single();

      if (error) throw error;

      this.opportunities.set(opportunity.id, data);
      return data;

    } catch (error) {
      console.error('[CRMIntegration] Erro ao criar oportunidade:', error);
      throw error;
    }
  }

  // Atualizar dados do paciente
  async updatePatientData(contactId, patientData) {
    try {
      // Verificar se já existe ficha do paciente
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('contact_id', contactId)
        .maybeSingle();

      let result;
      if (existingPatient) {
        // Atualizar
        const { data, error } = await supabase
          .from('patients')
          .update({
            ...patientData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPatient.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Criar nova
        const { data, error } = await supabase
          .from('patients')
          .insert({
            id: crypto.randomUUID(),
            contact_id: contactId,
            ...patientData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Atualizar cache
      this.patientProfiles.set(contactId, result);

      return result;

    } catch (error) {
      console.error('[CRMIntegration] Erro ao atualizar dados do paciente:', error);
      throw error;
    }
  }

  // Buscar histórico completo do paciente
  async getPatientHistory(contactId) {
    try {
      const [conversations, appointments, messages, opportunities] = await Promise.all([
        // Conversas
        supabase
          .from('conversations')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false }),

        // Agendamentos
        supabase
          .from('appointments')
          .select('*')
          .eq('contact_id', contactId)
          .order('start_time', { ascending: false }),

        // Mensagens recentes
        supabase
          .from('messages')
          .select('content, direction, created_at, message_type')
          .eq('conversation_id', supabase
            .from('conversations')
            .select('id')
            .eq('contact_id', contactId)
          )
          .order('created_at', { ascending: false })
          .limit(100),

        // Oportunidades
        supabase
          .from('opportunities')
          .select('*')
          .eq('conversation_id', supabase
            .from('conversations')
            .select('id')
            .eq('contact_id', contactId)
          )
          .order('created_at', { ascending: false })
      ]);

      return {
        conversations: conversations.data || [],
        appointments: appointments.data || [],
        messages: messages.data || [],
        opportunities: opportunities.data || []
      };

    } catch (error) {
      console.error('[CRMIntegration] Erro ao buscar histórico:', error);
      throw error;
    }
  }

  // Gerar relatório de CRM
  async generateCRMReport(options = {}) {
    const {
      dateRange = 30, // dias
      status = 'all',
      includeMetrics = true
    } = options;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    try {
      // Buscar conversas no período
      let query = supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(name, phone, email),
          messages(count)
        `)
        .gte('created_at', startDate.toISOString());

      if (status !== 'all') {
        query = query.eq('lead_status', status);
      }

      const { data: conversations, error } = await query;
      if (error) throw error;

      // Calcular métricas
      const metrics = includeMetrics ? {
        totalConversations: conversations.length,
        statusDistribution: conversations.reduce((acc, conv) => {
          const status = conv.lead_status || 'novo';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        avgMessagesPerConversation: conversations.length > 0 ?
          conversations.reduce((sum, conv) => sum + (conv.messages?.[0]?.count || 0), 0) / conversations.length : 0,
        conversionRate: conversations.length > 0 ?
          (conversations.filter(conv => conv.lead_status === 'fechado_ganho').length / conversations.length) * 100 : 0
      } : null;

      return {
        conversations,
        metrics,
        generatedAt: new Date().toISOString(),
        dateRange: `${startDate.toISOString().split('T')[0]} - ${new Date().toISOString().split('T')[0]}`
      };

    } catch (error) {
      console.error('[CRMIntegration] Erro ao gerar relatório:', error);
      throw error;
    }
  }

  // Limpar cache
  clearCache() {
    this.crmData.clear();
    this.patientProfiles.clear();
    this.leadStatuses.clear();
    this.opportunities.clear();
  }

  // Estatísticas do CRM
  getStats() {
    return {
      cachedConversations: this.crmData.size,
      cachedPatients: this.patientProfiles.size,
      cachedOpportunities: this.opportunities.size,
      leadStatusDistribution: Array.from(this.crmData.values()).reduce((acc, data) => {
        const status = data.conversation.lead_status || 'novo';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Instância global
export const crmIntegration = new CRMIntegrationManager();

// Hook React para integração CRM
export function useCRMIntegration(conversationId, options = {}) {
  const {
    autoLoad = true,
    includePatientData = true,
    includeHistory = false
  } = options;

  const [crmData, setCrmData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carregar dados CRM
  const loadCRMData = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await crmIntegration.loadConversationCRMData(conversationId);

      if (includePatientData && data.patient) {
        // Carregar dados adicionais do paciente se necessário
      }

      if (includeHistory) {
        data.history = await crmIntegration.getPatientHistory(data.conversation.contact_id);
      }

      setCrmData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, includePatientData, includeHistory]);

  useEffect(() => {
    if (autoLoad && conversationId) {
      loadCRMData();
    }
  }, [autoLoad, conversationId, loadCRMData]);

  // Atualizar status do lead
  const updateLeadStatus = useCallback(async (newStatus, notes = '') => {
    try {
      const result = await crmIntegration.updateLeadStatus(conversationId, newStatus, notes);
      setCrmData(prev => prev ? {
        ...prev,
        conversation: { ...prev.conversation, lead_status: newStatus }
      } : null);
      return result;
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      throw error;
    }
  }, [conversationId]);

  // Atualizar dados do paciente
  const updatePatientData = useCallback(async (patientData) => {
    if (!crmData?.conversation?.contact_id) return;

    try {
      const result = await crmIntegration.updatePatientData(
        crmData.conversation.contact_id,
        patientData
      );

      setCrmData(prev => prev ? {
        ...prev,
        patient: result
      } : null);

      return result;
    } catch (error) {
      console.error('Erro ao atualizar dados do paciente:', error);
      throw error;
    }
  }, [crmData]);

  // Criar oportunidade
  const createOpportunity = useCallback(async (opportunityData) => {
    try {
      const result = await crmIntegration.createOpportunity(conversationId, opportunityData);
      setCrmData(prev => prev ? {
        ...prev,
        opportunities: [...(prev.opportunities || []), result]
      } : null);
      return result;
    } catch (error) {
      console.error('Erro ao criar oportunidade:', error);
      throw error;
    }
  }, [conversationId]);

  return {
    crmData,
    loading,
    error,
    loadCRMData,
    updateLeadStatus,
    updatePatientData,
    createOpportunity,
    leadStatusMap: crmIntegration.leadStatusMap,
    stats: crmIntegration.getStats()
  };
}

// Hook para métricas de CRM
export function useCRMStats(options = {}) {
  const {
    autoLoad = true,
    refreshInterval = 5 * 60 * 1000 // 5 minutos
  } = options;

  const [stats, setStats] = useState({
    totalConversations: 0,
    activeLeads: 0,
    conversionRate: 0,
    avgEngagementScore: 0
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);

    try {
      // Buscar estatísticas básicas
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('lead_status, created_at');

      if (error) throw error;

      const totalConversations = conversations.length;
      const activeLeads = conversations.filter(c =>
        ['novo', 'contatado', 'qualificado', 'proposta', 'negociacao', 'atendendo', 'agendado'].includes(c.lead_status)
      ).length;

      const closedWon = conversations.filter(c => c.lead_status === 'fechado_ganho').length;
      const conversionRate = totalConversations > 0 ? (closedWon / totalConversations) * 100 : 0;

      setStats({
        totalConversations,
        activeLeads,
        conversionRate,
        avgEngagementScore: 75 // TODO: calcular baseado em métricas reais
      });

    } catch (error) {
      console.error('[useCRMStats] Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadStats();

      // Atualizar periodicamente
      const interval = setInterval(loadStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoLoad, loadStats, refreshInterval]);

  return {
    stats,
    loading,
    refresh: loadStats
  };
}

// Hook para ações recomendadas pelo CRM
export function useCRMRecommendations(conversationId) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecommendations = useCallback(async () => {
    if (!conversationId) {
      setRecommendations([]);
      return;
    }

    setLoading(true);

    try {
      const crmData = await crmIntegration.loadConversationCRMData(conversationId);
      const actions = crmIntegration.generateRecommendedActions(
        crmData.conversation,
        crmData.patient,
        crmData.appointments
      );

      setRecommendations(actions);
    } catch (error) {
      console.error('[useCRMRecommendations] Erro ao carregar recomendações:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  return {
    recommendations,
    loading,
    refresh: loadRecommendations
  };
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.CRMIntegration = {
    manager: crmIntegration,
    stats: () => crmIntegration.getStats(),
    loadConversationData: (id) => crmIntegration.loadConversationCRMData(id),
    leadStatusMap: crmIntegration.leadStatusMap,
    clearCache: () => crmIntegration.clearCache()
  };
}
