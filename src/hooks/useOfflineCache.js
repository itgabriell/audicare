import { useState, useEffect, useCallback } from 'react';

// IndexedDB wrapper para cache offline
class OfflineCacheDB {
  constructor() {
    this.dbName = 'AudicareOfflineCache';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store para dados da API
        if (!db.objectStoreNames.contains('apiCache')) {
          const apiStore = db.createObjectStore('apiCache', { keyPath: 'key' });
          apiStore.createIndex('timestamp', 'timestamp', { unique: false });
          apiStore.createIndex('expires', 'expires', { unique: false });
        }

        // Store para dados do usuário
        if (!db.objectStoreNames.contains('userData')) {
          const userStore = db.createObjectStore('userData', { keyPath: 'key' });
          userStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para imagens e assets
        if (!db.objectStoreNames.contains('assets')) {
          const assetsStore = db.createObjectStore('assets', { keyPath: 'key' });
          assetsStore.createIndex('type', 'type', { unique: false });
          assetsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async get(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async set(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clear(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll(storeName, indexName = null, query = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const request = query ? target.getAll(query) : target.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Limpar cache expirado
  async cleanupExpired() {
    if (!this.db) await this.init();

    const now = Date.now();
    const transaction = this.db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const index = store.index('expires');

    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    return new Promise((resolve) => {
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => resolve(0);
    });
  }
}

// Instância global do cache
const cacheDB = new OfflineCacheDB();

// Hook para gerenciar cache offline
export const useOfflineCache = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheSize, setCacheSize] = useState(0);

  // Monitorar status de conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Limpeza periódica de cache expirado
  useEffect(() => {
    const cleanup = async () => {
      try {
        const deleted = await cacheDB.cleanupExpired();
        if (deleted > 0) {
          console.log(`[Cache] Limpos ${deleted} itens expirados`);
        }
      } catch (error) {
        console.warn('[Cache] Erro na limpeza:', error);
      }
    };

    // Executar limpeza a cada 5 minutos
    const interval = setInterval(cleanup, 5 * 60 * 1000);
    cleanup(); // Executar imediatamente

    return () => clearInterval(interval);
  }, []);

  // Atualizar tamanho do cache
  const updateCacheSize = useCallback(async () => {
    try {
      const apiCache = await cacheDB.getAll('apiCache') || [];
      const userData = await cacheDB.getAll('userData') || [];
      const assets = await cacheDB.getAll('assets') || [];

      const totalSize = apiCache.length + userData.length + assets.length;
      setCacheSize(totalSize);
    } catch (error) {
      console.warn('[Cache] Erro ao calcular tamanho:', error);
    }
  }, []);

  useEffect(() => {
    updateCacheSize();
  }, [updateCacheSize]);

  // Cache com estratégia Network-First + Offline Fallback
  const cachedFetch = useCallback(async (key, fetcher, options = {}) => {
    const {
      ttl = 5 * 60 * 1000, // 5 minutos por padrão
      forceRefresh = false,
      backgroundSync = true
    } = options;

    try {
      // Verificar cache se não for forçado refresh
      if (!forceRefresh && isOnline) {
        const cached = await cacheDB.get('apiCache', key);
        if (cached && cached.expires > Date.now()) {
          // Cache válido, mas tentar atualizar em background se habilitado
          if (backgroundSync) {
            fetcher().then(async (freshData) => {
              await cacheDB.set('apiCache', {
                key,
                data: freshData,
                timestamp: Date.now(),
                expires: Date.now() + ttl
              });
            }).catch(() => {
              // Ignorar erro de atualização em background
            });
          }

          return { data: cached.data, fromCache: true };
        }
      }

      // Buscar dados frescos
      if (isOnline) {
        const data = await fetcher();
        await cacheDB.set('apiCache', {
          key,
          data,
          timestamp: Date.now(),
          expires: Date.now() + ttl
        });
        updateCacheSize();
        return { data, fromCache: false };
      }

      // Modo offline - tentar cache mesmo se expirado
      const cached = await cacheDB.get('apiCache', key);
      if (cached) {
        console.warn(`[Cache] Usando dados expirados para ${key} (modo offline)`);
        return { data: cached.data, fromCache: true, expired: true };
      }

      throw new Error('Dados não disponíveis offline');

    } catch (error) {
      // Tentar cache mesmo em caso de erro
      const cached = await cacheDB.get('apiCache', key);
      if (cached) {
        console.warn(`[Cache] Usando cache em caso de erro para ${key}`);
        return { data: cached.data, fromCache: true, error: true };
      }

      throw error;
    }
  }, [isOnline, updateCacheSize]);

  // Cache de dados do usuário (persistente)
  const cacheUserData = useCallback(async (key, data) => {
    await cacheDB.set('userData', {
      key,
      data,
      timestamp: Date.now()
    });
    updateCacheSize();
  }, [updateCacheSize]);

  const getUserData = useCallback(async (key) => {
    const cached = await cacheDB.get('userData', key);
    return cached?.data;
  }, []);

  // Cache de assets (imagens, etc.)
  const cacheAsset = useCallback(async (key, blob, type = 'image') => {
    await cacheDB.set('assets', {
      key,
      data: blob,
      type,
      timestamp: Date.now()
    });
    updateCacheSize();
  }, [updateCacheSize]);

  const getAsset = useCallback(async (key) => {
    const cached = await cacheDB.get('assets', key);
    return cached?.data;
  }, []);

  // Limpar cache
  const clearCache = useCallback(async (storeName = null) => {
    if (storeName) {
      await cacheDB.clear(storeName);
    } else {
      await cacheDB.clear('apiCache');
      await cacheDB.clear('userData');
      await cacheDB.clear('assets');
    }
    updateCacheSize();
  }, [updateCacheSize]);

  return {
    isOnline,
    cacheSize,
    cachedFetch,
    cacheUserData,
    getUserData,
    cacheAsset,
    getAsset,
    clearCache,
    updateCacheSize
  };
};

// Hook para virtual scrolling
export const useVirtualScroll = (items, itemHeight = 50, containerHeight = 400) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 5; // Buffer

  useEffect(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + visibleCount, items.length);

    setVisibleRange({ start, end });
  }, [scrollTop, itemHeight, visibleCount, items.length]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  const getItemStyle = (index) => ({
    position: 'absolute',
    top: index * itemHeight,
    height: itemHeight,
    width: '100%'
  });

  return {
    scrollTop,
    visibleRange,
    visibleItems,
    totalHeight,
    handleScroll,
    getItemStyle,
    containerStyle: {
      height: containerHeight,
      overflow: 'auto',
      position: 'relative'
    }
  };
};

// Hook para lazy loading de componentes
export const useLazyComponent = (importFunc, fallback = null) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadComponent = useCallback(async () => {
    if (Component) return Component;

    setLoading(true);
    setError(null);

    try {
      const module = await importFunc();
      const LoadedComponent = module.default || module;
      setComponent(() => LoadedComponent);
      return LoadedComponent;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [Component]);

  useEffect(() => {
    loadComponent();
  }, [loadComponent]);

  return {
    Component,
    loading,
    error,
    loadComponent
  };
};

// Hook para otimização de re-renders
export const useOptimizedState = (initialState) => {
  const [state, setState] = useState(initialState);

  const optimizedSetState = useCallback((newState) => {
    setState(prevState => {
      // Deep comparison para objetos
      if (typeof newState === 'object' && newState !== null) {
        if (JSON.stringify(prevState) === JSON.stringify(newState)) {
          return prevState; // Não atualizar se igual
        }
      }

      return newState;
    });
  }, []);

  return [state, optimizedSetState];
};

// Hook para debounced search
export const useDebouncedSearch = (delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm
  };
};

export default useOfflineCache;
