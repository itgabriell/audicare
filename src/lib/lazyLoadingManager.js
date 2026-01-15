import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { queryKeys } from '@/lib/queryClient';

// Gerenciador inteligente de lazy loading para componentes pesados
export class LazyLoadingManager {
  constructor() {
    this.loadedComponents = new Set();
    this.loadingPromises = new Map();
    this.preloadQueue = [];
  }

  // Carregar componente sob demanda
  async loadComponent(componentName) {
    if (this.loadedComponents.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    const promise = this._importComponent(componentName);
    this.loadingPromises.set(componentName, promise);

    try {
      const component = await promise;
      this.loadedComponents.add(componentName);
      return component;
    } catch (error) {
      this.loadingPromises.delete(componentName);
      throw error;
    }
  }

  // Import dinâmico baseado no nome do componente
  async _importComponent(componentName) {
    switch (componentName) {
      case 'ChatInput':
        return import('@/components/inbox/ChatInput');
      case 'ChatMessage':
        return import('@/components/inbox/ChatMessage');
      case 'ConversationList':
        return import('@/components/inbox/ConversationList');
      case 'FileUploadButton':
        return import('@/components/inbox/FileUploadButton');
      case 'AudioRecorder':
        return import('@/components/inbox/AudioRecorder');
      case 'AdvancedMessageSearch':
        return import('@/components/inbox/AdvancedMessageSearch');
      case 'MessageTemplates':
        return import('@/components/inbox/MessageTemplates');
      case 'QuickReplyPopover':
        return import('@/components/inbox/QuickReplyPopover');
      case 'EmojiPicker':
        return import('@/components/inbox/EmojiPicker');
      default:
        throw new Error(`Componente não encontrado: ${componentName}`);
    }
  }

  // Preload de componentes críticos
  preloadCriticalComponents() {
    const critical = ['ChatInput', 'ChatMessage', 'ConversationList'];
    critical.forEach(component => {
      if (!this.loadedComponents.has(component)) {
        this.preloadQueue.push(component);
      }
    });

    // Iniciar preload em background
    this._processPreloadQueue();
  }

  // Processar fila de preload
  async _processPreloadQueue() {
    while (this.preloadQueue.length > 0) {
      const componentName = this.preloadQueue.shift();
      try {
        await this.loadComponent(componentName);
      } catch (error) {
        console.warn(`Falha no preload de ${componentName}:`, error);
      }
    }
  }

  // Limpar cache quando necessário
  clearCache() {
    this.loadedComponents.clear();
    this.loadingPromises.clear();
    this.preloadQueue = [];
  }
}

// Instância global
export const lazyLoadingManager = new LazyLoadingManager();

// Hook para lazy loading com React
export function useLazyComponent(componentName, options = {}) {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  const loadComponent = useCallback(async () => {
    if (loadedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const module = await lazyLoadingManager.loadComponent(componentName);
      const ComponentExport = module.default || module[componentName];

      if (!ComponentExport) {
        throw new Error(`Export não encontrado para ${componentName}`);
      }

      setComponent(() => ComponentExport);
      loadedRef.current = true;

      // Callback opcional quando carrega
      options.onLoad?.(ComponentExport);
    } catch (err) {
      setError(err);
      options.onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [componentName, options]);

  // Carregar automaticamente se especificado
  useEffect(() => {
    if (options.autoLoad) {
      loadComponent();
    }
  }, [options.autoLoad, loadComponent]);

  return {
    Component,
    loading,
    error,
    loadComponent,
    isLoaded: loadedRef.current
  };
}

// Hook para lazy loading condicional baseado na visibilidade
export function useConditionalLazyLoad(componentName, condition, options = {}) {
  const { Component, loading, error, loadComponent, isLoaded } = useLazyComponent(
    componentName,
    { ...options, autoLoad: false }
  );

  useEffect(() => {
    if (condition && !isLoaded) {
      // Debounce para evitar carregamentos desnecessários
      const timeoutId = setTimeout(() => {
        loadComponent();
      }, options.delay || 100);

      return () => clearTimeout(timeoutId);
    }
  }, [condition, isLoaded, loadComponent, options.delay]);

  return { Component, loading, error, isLoaded };
}

// Hook para lazy loading baseado no scroll (intersection observer)
export function useScrollLazyLoad(componentName, targetRef, options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const { Component, loading, error, loadComponent, isLoaded } = useLazyComponent(
    componentName,
    { ...options, autoLoad: false }
  );

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px'
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [targetRef, options.threshold, options.rootMargin]);

  useEffect(() => {
    if (isVisible && !isLoaded) {
      loadComponent();
    }
  }, [isVisible, isLoaded, loadComponent]);

  return { Component, loading, error, isLoaded, isVisible };
}

// Hook para preload estratégico baseado no contexto
export function useStrategicPreload(context) {
  useEffect(() => {
    switch (context) {
      case 'inbox':
        // Preload componentes críticos do inbox
        lazyLoadingManager.preloadCriticalComponents();
        break;

      case 'chat':
        // Preload componentes de chat
        lazyLoadingManager.loadComponent('ChatInput');
        lazyLoadingManager.loadComponent('ChatMessage');
        break;

      case 'settings':
        // Preload componentes de configurações
        lazyLoadingManager.loadComponent('WebhookSettings');
        lazyLoadingManager.loadComponent('ChannelSettings');
        break;

      default:
        break;
    }
  }, [context]);
}

// Sistema de lazy loading para dados
export function useLazyData(queryFn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (loadedRef.current && !options.forceReload) return;

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      loadedRef.current = true;

      options.onSuccess?.(result);
    } catch (err) {
      setError(err);
      options.onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [queryFn, options]);

  // Auto-load condicional
  useEffect(() => {
    if (options.autoLoad && !loadedRef.current) {
      loadData();
    }
  }, [options.autoLoad, loadData]);

  return {
    data,
    loading,
    error,
    loadData,
    isLoaded: loadedRef.current,
    refetch: () => {
      loadedRef.current = false;
      return loadData();
    }
  };
}

// Lazy loading para mensagens com paginação
export function useLazyMessages(conversationId, options = {}) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = options.pageSize || 50;

  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || !conversationId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data.length < pageSize) {
        setHasMore(false);
      }

      // Adicionar mensagens no início (mais antigas primeiro)
      setMessages(prev => [...data.reverse(), ...prev]);
      setPage(prev => prev + 1);

    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading, hasMore, page, pageSize]);

  // Reset quando conversation muda
  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    setPage(0);
    setLoading(false);
  }, [conversationId]);

  return {
    messages,
    hasMore,
    loading,
    loadMoreMessages,
    totalLoaded: messages.length
  };
}

// Hook para lazy loading de conversas
export function useLazyConversations(options = {}) {
  const [conversations, setConversations] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = options.pageSize || 100;

  const loadMoreConversations = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .order('last_message_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data.length < pageSize) {
        setHasMore(false);
      }

      setConversations(prev => [...prev, ...data]);
      setPage(prev => prev + 1);

    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, pageSize]);

  return {
    conversations,
    hasMore,
    loading,
    loadMoreConversations,
    totalLoaded: conversations.length,
    refetch: () => {
      setConversations([]);
      setHasMore(true);
      setPage(0);
      loadMoreConversations();
    }
  };
}

// Inicializar preload crítico na aplicação
if (typeof window !== 'undefined') {
  // Preload de componentes críticos após o primeiro render
  setTimeout(() => {
    lazyLoadingManager.preloadCriticalComponents();
  }, 100);
}
