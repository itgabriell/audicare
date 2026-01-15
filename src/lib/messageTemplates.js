import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Sistema de templates de mensagens
export class MessageTemplateManager {
  constructor() {
    this.templates = new Map();
    this.categories = new Map();
    this.cache = new Map();
  }

  // Templates padrão
  get defaultTemplates() {
    return [
      {
        id: 'greeting_morning',
        category: 'saudacao',
        name: 'Bom dia',
        content: 'Olá! Bom dia! ☀️ Como posso ajudar você hoje?',
        variables: [],
        tags: ['saudacao', 'bom dia', 'atendimento']
      },
      {
        id: 'greeting_afternoon',
        category: 'saudacao',
        name: 'Boa tarde',
        content: 'Olá! Boa tarde! 🌞 Como posso ajudar você hoje?',
        variables: [],
        tags: ['saudacao', 'boa tarde', 'atendimento']
      },
      {
        id: 'greeting_evening',
        category: 'saudacao',
        name: 'Boa noite',
        content: 'Olá! Boa noite! 🌙 Como posso ajudar você hoje?',
        variables: [],
        tags: ['saudacao', 'boa noite', 'atendimento']
      },
      {
        id: 'confirmation',
        category: 'confirmacao',
        name: 'Confirmação',
        content: 'Obrigado por confirmar! ✅ Sua solicitação foi registrada.',
        variables: [],
        tags: ['confirmacao', 'obrigado']
      },
      {
        id: 'appointment_scheduled',
        category: 'agendamento',
        name: 'Agendamento Confirmado',
        content: '✅ Agendamento confirmado!\n\n📅 Data: {date}\n⏰ Horário: {time}\n👨‍⚕️ Profissional: {professional}\n📍 Local: {location}\n\nLembrete: Chegue 15 minutos antes.',
        variables: ['date', 'time', 'professional', 'location'],
        tags: ['agendamento', 'confirmacao', 'lembrete']
      },
      {
        id: 'appointment_reminder',
        category: 'lembrete',
        name: 'Lembrete de Consulta',
        content: '⏰ Lembrete: Você tem uma consulta amanhã!\n\n📅 {date} às {time}\n👨‍⚕️ {professional}\n📍 {location}\n\nEstamos esperando você! 😊',
        variables: ['date', 'time', 'professional', 'location'],
        tags: ['lembrete', 'consulta', 'agendamento']
      },
      {
        id: 'payment_pending',
        category: 'pagamento',
        name: 'Pagamento Pendente',
        content: '💳 Detectamos um pagamento pendente no valor de R$ {amount}.\n\nPara confirmar seu agendamento, por favor efetue o pagamento através do link: {payment_link}\n\nQualquer dúvida, estamos à disposição!',
        variables: ['amount', 'payment_link'],
        tags: ['pagamento', 'pendente', 'financeiro']
      },
      {
        id: 'thank_you',
        category: 'agradecimento',
        name: 'Obrigado',
        content: 'Muito obrigado pelo seu contato! 🙏\n\nFoi um prazer atendê-lo. Estamos sempre à disposição para ajudar.\n\nAté logo! 👋',
        variables: [],
        tags: ['obrigado', 'agradecimento', 'encerramento']
      },
      {
        id: 'follow_up',
        category: 'acompanhamento',
        name: 'Acompanhamento',
        content: 'Olá {name}! 👋\n\nPassando para dar um feedback sobre sua consulta de {date}.\n\nComo foi sua experiência? Estamos sempre buscando melhorar nosso atendimento.\n\nSua opinião é muito importante para nós! ⭐',
        variables: ['name', 'date'],
        tags: ['acompanhamento', 'feedback', 'satisfacao']
      },
      {
        id: 'emergency_contact',
        category: 'emergencia',
        name: 'Contato de Emergência',
        content: '🚨 ATENÇÃO: Contato de emergência!\n\nEm caso de urgência, ligue imediatamente para:\n📞 (11) 99999-9999\n\nEstamos disponíveis 24/7 para emergências.',
        variables: [],
        tags: ['emergencia', 'urgente', 'contato']
      }
    ];
  }

  // Carregar templates do banco
  async loadTemplates(options = {}) {
    const { userId, category } = options;

    try {
      let query = supabase
        .from('message_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mesclar com templates padrão
      const allTemplates = [...this.defaultTemplates];

      // Adicionar templates customizados (evitar duplicatas)
      const defaultIds = new Set(this.defaultTemplates.map(t => t.id));
      data?.forEach(template => {
        if (!defaultIds.has(template.id)) {
          allTemplates.push(template);
        }
      });

      // Indexar templates
      allTemplates.forEach(template => {
        this.templates.set(template.id, template);

        // Indexar por categoria
        if (!this.categories.has(template.category)) {
          this.categories.set(template.category, []);
        }
        this.categories.get(template.category).push(template);
      });

      return allTemplates;

    } catch (error) {
      console.error('[MessageTemplateManager] Erro ao carregar templates:', error);
      return this.defaultTemplates;
    }
  }

  // Obter template por ID
  getTemplate(templateId) {
    return this.templates.get(templateId) || this.defaultTemplates.find(t => t.id === templateId);
  }

  // Obter templates por categoria
  getTemplatesByCategory(category) {
    return this.categories.get(category) || [];
  }

  // Buscar templates
  searchTemplates(query, options = {}) {
    const { category, tags, limit = 10 } = options;
    const results = [];

    for (const template of this.templates.values()) {
      // Filtrar por categoria
      if (category && template.category !== category) continue;

      // Filtrar por tags
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(tag =>
          template.tags?.some(templateTag =>
            templateTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) continue;
      }

      // Buscar por nome ou conteúdo
      const searchText = `${template.name} ${template.content}`.toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push(template);
        if (results.length >= limit) break;
      }
    }

    // Ordenar por uso
    return results.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
  }

  // Criar template customizado
  async createTemplate(templateData) {
    const template = {
      id: crypto.randomUUID(),
      ...templateData,
      created_at: new Date().toISOString(),
      usage_count: 0,
      is_custom: true
    };

    try {
      const { data, error } = await supabase
        .from('message_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;

      // Adicionar ao cache local
      this.templates.set(template.id, data);
      if (!this.categories.has(template.category)) {
        this.categories.set(template.category, []);
      }
      this.categories.get(template.category).push(data);

      return data;

    } catch (error) {
      console.error('[MessageTemplateManager] Erro ao criar template:', error);
      throw error;
    }
  }

  // Atualizar template
  async updateTemplate(templateId, updates) {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar cache local
      if (this.templates.has(templateId)) {
        const oldTemplate = this.templates.get(templateId);

        // Remover da categoria antiga se mudou
        if (updates.category && updates.category !== oldTemplate.category) {
          const oldCategory = this.categories.get(oldTemplate.category);
          if (oldCategory) {
            const index = oldCategory.findIndex(t => t.id === templateId);
            if (index > -1) oldCategory.splice(index, 1);
          }
        }

        this.templates.set(templateId, data);

        // Adicionar à nova categoria
        if (!this.categories.has(data.category)) {
          this.categories.set(data.category, []);
        }
        this.categories.get(data.category).push(data);
      }

      return data;

    } catch (error) {
      console.error('[MessageTemplateManager] Erro ao atualizar template:', error);
      throw error;
    }
  }

  // Deletar template
  async deleteTemplate(templateId) {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      // Remover do cache local
      if (this.templates.has(templateId)) {
        const template = this.templates.get(templateId);
        this.templates.delete(templateId);

        // Remover da categoria
        const category = this.categories.get(template.category);
        if (category) {
          const index = category.findIndex(t => t.id === templateId);
          if (index > -1) category.splice(index, 1);
        }
      }

    } catch (error) {
      console.error('[MessageTemplateManager] Erro ao deletar template:', error);
      throw error;
    }
  }

  // Registrar uso de template
  async recordUsage(templateId) {
    try {
      const { error } = await supabase
        .from('message_templates')
        .update({
          usage_count: supabase.raw('usage_count + 1'),
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) throw error;

      // Atualizar cache local
      if (this.templates.has(templateId)) {
        const template = this.templates.get(templateId);
        template.usage_count = (template.usage_count || 0) + 1;
        template.last_used_at = new Date().toISOString();
      }

    } catch (error) {
      console.warn('[MessageTemplateManager] Erro ao registrar uso:', error);
    }
  }

  // Processar template com variáveis
  processTemplate(templateId, variables = {}) {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    let content = template.content;

    // Substituir variáveis
    template.variables?.forEach(variable => {
      const regex = new RegExp(`{${variable}}`, 'g');
      const value = variables[variable] || `{${variable}}`;
      content = content.replace(regex, value);
    });

    return {
      ...template,
      processedContent: content,
      variables: { ...variables }
    };
  }

  // Obter estatísticas
  getStats() {
    const templates = Array.from(this.templates.values());
    const categories = {};

    templates.forEach(template => {
      if (!categories[template.category]) {
        categories[template.category] = {
          count: 0,
          totalUsage: 0,
          mostUsed: null
        };
      }

      categories[template.category].count++;
      categories[template.category].totalUsage += template.usage_count || 0;

      if (!categories[template.category].mostUsed ||
          (template.usage_count || 0) > (categories[template.category].mostUsed.usage_count || 0)) {
        categories[template.category].mostUsed = template;
      }
    });

    return {
      totalTemplates: templates.length,
      categories,
      mostUsed: templates
        .filter(t => t.usage_count > 0)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5)
    };
  }

  // Limpar cache
  clearCache() {
    this.templates.clear();
    this.categories.clear();
  }
}

// Instância global
export const templateManager = new MessageTemplateManager();

// Hook React para templates de mensagens
export function useMessageTemplates(options = {}) {
  const {
    autoLoad = true,
    userId,
    category
  } = options;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carregar templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loadedTemplates = await templateManager.loadTemplates({
        userId,
        category
      });

      setTemplates(loadedTemplates);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId, category]);

  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad, loadTemplates]);

  // Usar template
  const useTemplate = useCallback(async (templateId, variables = {}) => {
    const processedTemplate = templateManager.processTemplate(templateId, variables);

    if (processedTemplate) {
      // Registrar uso
      await templateManager.recordUsage(templateId);

      // Atualizar estado local
      setTemplates(prev =>
        prev.map(t =>
          t.id === templateId
            ? { ...t, usage_count: (t.usage_count || 0) + 1, last_used_at: new Date().toISOString() }
            : t
        )
      );
    }

    return processedTemplate;
  }, []);

  // Criar template
  const createTemplate = useCallback(async (templateData) => {
    const newTemplate = await templateManager.createTemplate(templateData);
    setTemplates(prev => [newTemplate, ...prev]);
    return newTemplate;
  }, []);

  // Atualizar template
  const updateTemplate = useCallback(async (templateId, updates) => {
    const updatedTemplate = await templateManager.updateTemplate(templateId, updates);
    setTemplates(prev =>
      prev.map(t => t.id === templateId ? updatedTemplate : t)
    );
    return updatedTemplate;
  }, []);

  // Deletar template
  const deleteTemplate = useCallback(async (templateId) => {
    await templateManager.deleteTemplate(templateId);
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  // Buscar templates
  const searchTemplates = useCallback((query, searchOptions = {}) => {
    return templateManager.searchTemplates(query, searchOptions);
  }, []);

  return {
    templates,
    loading,
    error,
    loadTemplates,
    useTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    searchTemplates,
    stats: templateManager.getStats()
  };
}

// Hook para templates por categoria
export function useTemplatesByCategory() {
  const [categories, setCategories] = useState({});

  useEffect(() => {
    const loadCategories = async () => {
      const allTemplates = await templateManager.loadTemplates();
      const categoryMap = {};

      allTemplates.forEach(template => {
        if (!categoryMap[template.category]) {
          categoryMap[template.category] = [];
        }
        categoryMap[template.category].push(template);
      });

      setCategories(categoryMap);
    };

    loadCategories();
  }, []);

  return categories;
}

// Hook para templates recentes/favoritos
export function useRecentTemplates(limit = 5) {
  const [recentTemplates, setRecentTemplates] = useState([]);

  useEffect(() => {
    const loadRecent = async () => {
      const allTemplates = await templateManager.loadTemplates();

      const recent = allTemplates
        .filter(t => t.last_used_at)
        .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))
        .slice(0, limit);

      setRecentTemplates(recent);
    };

    loadRecent();
  }, [limit]);

  return recentTemplates;
}

// Hook para processamento de templates
export function useTemplateProcessor() {
  const processTemplate = useCallback((templateId, variables = {}) => {
    return templateManager.processTemplate(templateId, variables);
  }, []);

  const validateVariables = useCallback((templateId, variables = {}) => {
    const template = templateManager.getTemplate(templateId);
    if (!template) return { valid: false, errors: ['Template não encontrado'] };

    const missingVariables = template.variables?.filter(variable =>
      !variables[variable] || variables[variable].trim() === ''
    ) || [];

    return {
      valid: missingVariables.length === 0,
      errors: missingVariables.map(variable => `Variável obrigatória: ${variable}`)
    };
  }, []);

  return {
    processTemplate,
    validateVariables
  };
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.MessageTemplates = {
    manager: templateManager,
    stats: () => templateManager.getStats(),
    search: (query) => templateManager.searchTemplates(query),
    clearCache: () => templateManager.clearCache(),
    defaultTemplates: templateManager.defaultTemplates
  };
}
