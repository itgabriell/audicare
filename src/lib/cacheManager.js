// Cache Manager - Sistema de Cache Distribuído
// Suporte a múltiplas estratégias de cache e backends

export class CacheManager {
  constructor() {
    this.stores = new Map();
    this.strategies = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
  }

  // Registrar um store de cache (localStorage, sessionStorage, IndexedDB, Redis, etc.)
  registerStore(name, store) {
    this.stores.set(name, store);
  }

  // Registrar uma estratégia de cache
  registerStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }

  // Cache simples com TTL
  async set(key, value, options = {}) {
    const {
      ttl = this.defaultTTL,
      store = 'localStorage',
      strategy = 'default'
    } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      throw new Error(`Store '${store}' not registered`);
    }

    const strategyInstance = this.strategies.get(strategy) || this.strategies.get('default');
    if (!strategyInstance) {
      throw new Error(`Strategy '${strategy}' not registered`);
    }

    const cacheEntry = {
      value,
      timestamp: Date.now(),
      ttl,
      strategy,
      metadata: options.metadata || {}
    };

    // Aplicar estratégia antes de armazenar
    const processedEntry = await strategyInstance.beforeSet(key, cacheEntry);

    await storeInstance.set(key, processedEntry);
  }

  // Recuperar do cache
  async get(key, options = {}) {
    const { store = 'localStorage', strategy = 'default' } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      return null;
    }

    const strategyInstance = this.strategies.get(strategy) || this.strategies.get('default');

    let entry = await storeInstance.get(key);
    if (!entry) {
      return null;
    }

    // Verificar TTL
    if (this.isExpired(entry)) {
      await this.delete(key, { store });
      return null;
    }

    // Aplicar estratégia após recuperar
    entry = await strategyInstance.afterGet(key, entry);

    return entry.value;
  }

  // Verificar se entrada expirou
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Deletar do cache
  async delete(key, options = {}) {
    const { store = 'localStorage' } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      return false;
    }

    return await storeInstance.delete(key);
  }

  // Limpar cache
  async clear(options = {}) {
    const { store = 'localStorage' } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      return false;
    }

    return await storeInstance.clear();
  }

  // Verificar se chave existe
  async has(key, options = {}) {
    const { store = 'localStorage' } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      return false;
    }

    const entry = await storeInstance.get(key);
    return entry && !this.isExpired(entry);
  }

  // Obter estatísticas do cache
  async stats(options = {}) {
    const { store = 'localStorage' } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      return null;
    }

    return await storeInstance.stats();
  }

  // Cleanup automático (remover entradas expiradas)
  async cleanup(options = {}) {
    const { store = 'localStorage' } = options;

    const storeInstance = this.stores.get(store);
    if (!storeInstance) {
      return;
    }

    const keys = await storeInstance.keys();
    let removed = 0;

    for (const key of keys) {
      const entry = await storeInstance.get(key);
      if (entry && this.isExpired(entry)) {
        await storeInstance.delete(key);
        removed++;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Cleanup: removed ${removed} expired entries`);
    }

    return removed;
  }
}

// Estratégias de Cache

// Estratégia padrão - sem transformação
export class DefaultCacheStrategy {
  async beforeSet(key, entry) {
    return entry;
  }

  async afterGet(key, entry) {
    return entry;
  }
}

// Estratégia de compressão
export class CompressionStrategy {
  async beforeSet(key, entry) {
    // Comprimir valor se for string grande
    if (typeof entry.value === 'string' && entry.value.length > 1000) {
      entry.value = await this.compress(entry.value);
      entry.compressed = true;
    }
    return entry;
  }

  async afterGet(key, entry) {
    // Descomprimir se necessário
    if (entry.compressed) {
      entry.value = await this.decompress(entry.value);
    }
    return entry;
  }

  async compress(data) {
    // Implementar compressão (ex: LZString, pako)
    return btoa(JSON.stringify(data)); // Simplificado
  }

  async decompress(data) {
    // Implementar descompressão
    return JSON.parse(atob(data)); // Simplificado
  }
}

// Estratégia de serialização
export class SerializationStrategy {
  async beforeSet(key, entry) {
    // Serializar objetos complexos
    if (typeof entry.value === 'object' && entry.value !== null) {
      entry.value = JSON.stringify(entry.value);
      entry.serialized = true;
    }
    return entry;
  }

  async afterGet(key, entry) {
    // Deserializar se necessário
    if (entry.serialized) {
      entry.value = JSON.parse(entry.value);
    }
    return entry;
  }
}

// Estratégia LRU (Least Recently Used)
export class LRUStrategy {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.accessOrder = new Map();
  }

  async beforeSet(key, entry) {
    // Atualizar ordem de acesso
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());

    // Se atingiu limite, remover menos recente
    if (this.accessOrder.size > this.maxSize) {
      const [oldestKey] = this.accessOrder.keys();
      this.accessOrder.delete(oldestKey);
      // O store precisa lidar com a remoção
    }

    return entry;
  }

  async afterGet(key, entry) {
    // Atualizar ordem de acesso
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());
    return entry;
  }
}

// Stores de Cache

// localStorage Store
export class LocalStorageStore {
  async set(key, value) {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[LocalStorageStore] Error setting item:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('[LocalStorageStore] Error getting item:', error);
      return null;
    }
  }

  async delete(key) {
    try {
      localStorage.removeItem(`cache_${key}`);
      return true;
    } catch (error) {
      console.warn('[LocalStorageStore] Error deleting item:', error);
      return false;
    }
  }

  async clear() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('[LocalStorageStore] Error clearing:', error);
      return false;
    }
  }

  async keys() {
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .map(key => key.replace('cache_', ''));
    } catch (error) {
      console.warn('[LocalStorageStore] Error getting keys:', error);
      return [];
    }
  }

  async stats() {
    try {
      const keys = await this.keys();
      let totalSize = 0;
      let entries = 0;

      keys.forEach(key => {
        const item = localStorage.getItem(`cache_${key}`);
        if (item) {
          totalSize += item.length;
          entries++;
        }
      });

      return {
        entries,
        totalSize,
        averageSize: entries > 0 ? totalSize / entries : 0
      };
    } catch (error) {
      console.warn('[LocalStorageStore] Error getting stats:', error);
      return null;
    }
  }
}

// sessionStorage Store
export class SessionStorageStore extends LocalStorageStore {
  async set(key, value) {
    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[SessionStorageStore] Error setting item:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const item = sessionStorage.getItem(`cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('[SessionStorageStore] Error getting item:', error);
      return null;
    }
  }

  async delete(key) {
    try {
      sessionStorage.removeItem(`cache_${key}`);
      return true;
    } catch (error) {
      console.warn('[SessionStorageStore] Error deleting item:', error);
      return false;
    }
  }

  async clear() {
    try {
      const keys = Object.keys(sessionStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => sessionStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('[SessionStorageStore] Error clearing:', error);
      return false;
    }
  }

  async keys() {
    try {
      return Object.keys(sessionStorage)
        .filter(key => key.startsWith('cache_'))
        .map(key => key.replace('cache_', ''));
    } catch (error) {
      console.warn('[SessionStorageStore] Error getting keys:', error);
      return [];
    }
  }

  async stats() {
    try {
      const keys = await this.keys();
      let totalSize = 0;
      let entries = 0;

      keys.forEach(key => {
        const item = sessionStorage.getItem(`cache_${key}`);
        if (item) {
          totalSize += item.length;
          entries++;
        }
      });

      return {
        entries,
        totalSize,
        averageSize: entries > 0 ? totalSize / entries : 0
      };
    } catch (error) {
      console.warn('[SessionStorageStore] Error getting stats:', error);
      return null;
    }
  }
}

// IndexedDB Store (para dados maiores)
export class IndexedDBStore {
  constructor(dbName = 'audicare-cache', storeName = 'cache') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getDB() {
    return await this.dbPromise;
  }

  async set(key, value) {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise((resolve, reject) => {
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return true;
    } catch (error) {
      console.warn('[IndexedDBStore] Error setting item:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      return await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDBStore] Error getting item:', error);
      return null;
    }
  }

  async delete(key) {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return true;
    } catch (error) {
      console.warn('[IndexedDBStore] Error deleting item:', error);
      return false;
    }
  }

  async clear() {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return true;
    } catch (error) {
      console.warn('[IndexedDBStore] Error clearing:', error);
      return false;
    }
  }

  async keys() {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      return await new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDBStore] Error getting keys:', error);
      return [];
    }
  }

  async stats() {
    // Implementar estatísticas para IndexedDB
    return null;
  }
}

// Instância global
export const cacheManager = new CacheManager();

// Registrar stores padrão
cacheManager.registerStore('localStorage', new LocalStorageStore());
cacheManager.registerStore('sessionStorage', new SessionStorageStore());
cacheManager.registerStore('indexedDB', new IndexedDBStore());

// Registrar estratégias padrão
cacheManager.registerStrategy('default', new DefaultCacheStrategy());
cacheManager.registerStrategy('compression', new CompressionStrategy());
cacheManager.registerStrategy('serialization', new SerializationStrategy());
cacheManager.registerStrategy('lru', new LRUStrategy());

// Inicializar IndexedDB quando disponível
if (typeof window !== 'undefined' && window.indexedDB) {
  cacheManager.stores.get('indexedDB').dbPromise.catch(error => {
    console.warn('[CacheManager] IndexedDB initialization failed:', error);
  });
}

// Função utilitária para cache com React Query
export function createCachedQuery(key, fetcher, options = {}) {
  return {
    queryKey: key,
    queryFn: async () => {
      // Tentar cache primeiro
      const cached = await cacheManager.get(key.join(':'));

      if (cached !== null) {
        return cached;
      }

      // Buscar dados
      const data = await fetcher();

      // Cachear resultado
      await cacheManager.set(key.join(':'), data, options);

      return data;
    },
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.gcTime || 10 * 60 * 1000,
  };
}

// Hook para cache imperativo
export function useCache() {
  return {
    set: (key, value, options) => cacheManager.set(key, value, options),
    get: (key, options) => cacheManager.get(key, options),
    delete: (key, options) => cacheManager.delete(key, options),
    clear: (options) => cacheManager.clear(options),
    has: (key, options) => cacheManager.has(key, options),
    stats: (options) => cacheManager.stats(options),
    cleanup: (options) => cacheManager.cleanup(options),
  };
}

// Cleanup automático periódico
if (typeof window !== 'undefined') {
  // Executar cleanup a cada hora
  setInterval(() => {
    cacheManager.cleanup();
  }, 60 * 60 * 1000);

  // Executar cleanup na carga da página
  window.addEventListener('load', () => {
    setTimeout(() => cacheManager.cleanup(), 5000);
  });
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.CacheManager = {
    set: (key, value, options) => cacheManager.set(key, value, options),
    get: (key, options) => cacheManager.get(key, options),
    delete: (key, options) => cacheManager.delete(key, options),
    clear: (options) => cacheManager.clear(options),
    stats: (options) => cacheManager.stats(options),
    cleanup: () => cacheManager.cleanup(),
  };
}
