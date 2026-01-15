import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Gerenciador de estado offline
export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingActions = [];
    this.syncQueue = [];
    this.eventListeners = new Set();
    this.storageKey = 'audicare_offline_data';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo

    this.init();
  }

  init() {
    // Monitorar mudanças de conectividade
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Carregar dados pendentes do localStorage
    this.loadPendingData();

    // Iniciar sincronização se estiver online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // Handlers para mudança de conectividade
  handleOnline() {
    this.isOnline = true;
    console.log('[OfflineManager] Conexão restaurada');
    this.notifyListeners('online', { wasOffline: true });
    this.processSyncQueue();
  }

  handleOffline() {
    this.isOnline = false;
    console.log('[OfflineManager] Conexão perdida');
    this.notifyListeners('offline', { isOffline: true });
  }

  // Sistema de eventos
  subscribe(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.eventListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[OfflineManager] Erro no listener:', error);
      }
    });
  }

  // Verificar conectividade
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      hasPendingActions: this.pendingActions.length > 0,
      pendingCount: this.pendingActions.length,
      syncQueueLength: this.syncQueue.length
    };
  }

  // Adicionar ação pendente para quando estiver offline
  addPendingAction(action) {
    const pendingAction = {
      id: crypto.randomUUID(),
      type: action.type,
      data: action.data,
      timestamp: Date.now(),
      retries: 0
    };

    this.pendingActions.push(pendingAction);
    this.savePendingData();

    if (!this.isOnline) {
      this.notifyListeners('pending_action_added', pendingAction);
    }

    return pendingAction.id;
  }

  // Executar ação ou enfileirar para sincronização
  async executeAction(action) {
    if (this.isOnline) {
      try {
        const result = await this.performAction(action);
        this.notifyListeners('action_success', { action, result });
        return result;
      } catch (error) {
        console.warn('[OfflineManager] Ação falhou, enfileirando para retry:', error);
        this.addToSyncQueue(action);
        throw error;
      }
    } else {
      // Offline: armazenar para sincronização posterior
      const actionId = this.addPendingAction(action);
      return { offline: true, actionId };
    }
  }

  // Adicionar à fila de sincronização
  addToSyncQueue(action) {
    const syncAction = {
      id: crypto.randomUUID(),
      action,
      timestamp: Date.now(),
      retries: 0,
      lastError: null
    };

    this.syncQueue.push(syncAction);
    this.savePendingData();
    this.notifyListeners('sync_queued', syncAction);
  }

  // Processar fila de sincronização
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    console.log(`[OfflineManager] Processando ${this.syncQueue.length} ações na fila de sync`);

    const actionsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const syncAction of actionsToProcess) {
      try {
        const result = await this.performAction(syncAction.action);
        this.notifyListeners('sync_success', { syncAction, result });

        // Remover da fila após sucesso
        this.removeFromSyncQueue(syncAction.id);

      } catch (error) {
        syncAction.retries++;
        syncAction.lastError = error.message;

        if (syncAction.retries < this.maxRetries) {
          // Re-enfileirar com delay exponencial
          setTimeout(() => {
            this.syncQueue.unshift(syncAction);
            this.savePendingData();
          }, this.retryDelay * Math.pow(2, syncAction.retries));
        } else {
          // Máximo de retries atingido
          console.error('[OfflineManager] Máximo de retries atingido para ação:', syncAction);
          this.notifyListeners('sync_failed', { syncAction, error });
          this.removeFromSyncQueue(syncAction.id);
        }
      }
    }

    this.savePendingData();
  }

  // Executar ação específica
  async performAction(action) {
    switch (action.type) {
      case 'send_message':
        return await this.sendMessage(action.data);

      case 'mark_as_read':
        return await this.markAsRead(action.data);

      case 'update_conversation':
        return await this.updateConversation(action.data);

      case 'create_contact':
        return await this.createContact(action.data);

      default:
        throw new Error(`Tipo de ação não suportado: ${action.type}`);
    }
  }

  // Implementações específicas das ações
  async sendMessage({ conversationId, content, messageType, mediaUrl }) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        content,
        message_type: messageType || 'text',
        media_url: mediaUrl,
        direction: 'outbound',
        status: 'sent',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async markAsRead({ conversationId }) {
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (error) throw error;
    return { success: true };
  }

  async updateConversation({ conversationId, updates }) {
    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createContact(contactData) {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contactData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Gerenciamento de dados pendentes
  savePendingData() {
    const data = {
      pendingActions: this.pendingActions,
      syncQueue: this.syncQueue,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[OfflineManager] Erro ao salvar dados pendentes:', error);
    }
  }

  loadPendingData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.pendingActions = parsed.pendingActions || [];
        this.syncQueue = parsed.syncQueue || [];
      }
    } catch (error) {
      console.error('[OfflineManager] Erro ao carregar dados pendentes:', error);
    }
  }

  removeFromSyncQueue(actionId) {
    this.syncQueue = this.syncQueue.filter(action => action.id !== actionId);
    this.savePendingData();
  }

  // Limpar dados pendentes (útil para reset)
  clearPendingData() {
    this.pendingActions = [];
    this.syncQueue = [];
    localStorage.removeItem(this.storageKey);
    this.notifyListeners('data_cleared');
  }

  // Estatísticas de uso offline
  getOfflineStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);

    const recentActions = this.pendingActions.filter(action =>
      action.timestamp > last24h
    );

    return {
      totalPending: this.pendingActions.length,
      syncQueueLength: this.syncQueue.length,
      recentActionsCount: recentActions.length,
      isOnline: this.isOnline,
      storageSize: this.calculateStorageSize()
    };
  }

  calculateStorageSize() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  // Cleanup
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.eventListeners.clear();
    this.clearPendingData();
  }
}

// Instância global
export const offlineManager = new OfflineManager();

// Hook React para usar o offline manager
export function useOfflineManager() {
  const [connectionStatus, setConnectionStatus] = useState(
    offlineManager.getConnectionStatus()
  );

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((event, data) => {
      setConnectionStatus(offlineManager.getConnectionStatus());

      // Logs específicos para debug
      switch (event) {
        case 'online':
          console.log('[useOfflineManager] Conexão restaurada');
          break;
        case 'offline':
          console.log('[useOfflineManager] Conexão perdida');
          break;
        case 'sync_success':
          console.log('[useOfflineManager] Ação sincronizada:', data.syncAction.action.type);
          break;
        case 'sync_failed':
          console.warn('[useOfflineManager] Falha na sincronização:', data.error);
          break;
      }
    });

    // Atualização inicial
    setConnectionStatus(offlineManager.getConnectionStatus());

    return unsubscribe;
  }, []);

  const executeOfflineAction = useCallback(async (action) => {
    return await offlineManager.executeAction(action);
  }, []);

  const getOfflineStats = useCallback(() => {
    return offlineManager.getOfflineStats();
  }, []);

  return {
    ...connectionStatus,
    executeOfflineAction,
    getOfflineStats,
    clearPendingData: () => offlineManager.clearPendingData()
  };
}

// Hook específico para mensagens offline
export function useOfflineMessages() {
  const { executeOfflineAction, isOnline, hasPendingActions } = useOfflineManager();

  const sendMessageOffline = useCallback(async (messageData) => {
    const action = {
      type: 'send_message',
      data: messageData
    };

    const result = await executeOfflineAction(action);

    // Retornar dados para otimistic update
    if (result.offline) {
      return {
        id: `temp_${Date.now()}`,
        ...messageData,
        status: 'pending',
        created_at: new Date().toISOString(),
        direction: 'outbound',
        _offline: true
      };
    }

    return result;
  }, [executeOfflineAction]);

  const markAsReadOffline = useCallback(async (conversationId) => {
    const action = {
      type: 'mark_as_read',
      data: { conversationId }
    };

    return await executeOfflineAction(action);
  }, [executeOfflineAction]);

  return {
    sendMessageOffline,
    markAsReadOffline,
    isOnline,
    hasPendingActions
  };
}

// Hook para presença offline/online
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Testar qualidade da conexão
    const testConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      try {
        const start = Date.now();
        const response = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
        const end = Date.now();
        const latency = end - start;

        if (latency < 100) setConnectionQuality('excellent');
        else if (latency < 300) setConnectionQuality('good');
        else if (latency < 1000) setConnectionQuality('fair');
        else setConnectionQuality('poor');
      } catch {
        setConnectionQuality('unstable');
      }
    };

    testConnectionQuality();
    const qualityInterval = setInterval(testConnectionQuality, 30000); // Testar a cada 30s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
    };
  }, []);

  return { isOnline, connectionQuality };
}

// Hook para dados offline-first
export function useOfflineFirst(queryFn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const cacheKey = options.cacheKey || 'offline_data';
  const staleTime = options.staleTime || 5 * 60 * 1000; // 5 minutos

  // Carregar do cache primeiro
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < staleTime) {
          setData(parsed.data);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('[useOfflineFirst] Erro ao carregar cache:', error);
    }
    return null;
  }, [cacheKey, staleTime]);

  // Salvar no cache
  const saveToCache = useCallback((data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[useOfflineFirst] Erro ao salvar cache:', error);
    }
  }, [cacheKey]);

  // Carregar dados
  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    // Tentar cache primeiro
    const cachedData = loadFromCache();
    if (cachedData && !force) {
      setLoading(false);
      return cachedData;
    }

    try {
      const freshData = await queryFn();
      setData(freshData);
      saveToCache(freshData);

      if (!navigator.onLine) {
        setIsOffline(true);
      }

      return freshData;
    } catch (err) {
      setError(err);

      // Se falhou e temos cache, usar cache
      if (cachedData) {
        return cachedData;
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [queryFn, loadFromCache, saveToCache]);

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Recarregar dados quando voltar online
      loadData(true);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load inicial
    loadData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData]);

  return {
    data,
    loading,
    error,
    isOffline,
    refetch: () => loadData(true)
  };
}

// Utilitários para compressão de dados
export const dataCompressor = {
  // Comprimir dados usando LZ-string (se disponível)
  compress: (data) => {
    try {
      if (typeof LZString !== 'undefined') {
        return LZString.compressToUTF16(JSON.stringify(data));
      }
      return JSON.stringify(data);
    } catch {
      return JSON.stringify(data);
    }
  },

  // Descomprimir dados
  decompress: (compressedData) => {
    try {
      if (typeof LZString !== 'undefined') {
        return JSON.parse(LZString.decompressFromUTF16(compressedData));
      }
      return JSON.parse(compressedData);
    } catch {
      return JSON.parse(compressedData);
    }
  }
};

// Cleanup automático quando a página fecha
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    offlineManager.savePendingData();
  });
}
