import { useCallback, useRef, useState } from 'react';

// Sistema inteligente de compressão de dados
export class DataCompressor {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'lz-string'; // 'lz-string' | 'gzip' | 'deflate'
    this.level = options.level || 6; // 1-9 para gzip
    this.minSize = options.minSize || 1000; // bytes - só comprimir acima deste tamanho
    this.cache = new Map();
    this.maxCacheSize = options.maxCacheSize || 50;
  }

  // Comprimir dados
  async compress(data, options = {}) {
    const {
      algorithm = this.algorithm,
      force = false
    } = options;

    // Verificar tamanho mínimo
    const dataString = JSON.stringify(data);
    if (!force && dataString.length < this.minSize) {
      return {
        data: dataString,
        compressed: false,
        originalSize: dataString.length,
        compressedSize: dataString.length,
        ratio: 1
      };
    }

    // Verificar cache
    const cacheKey = this.getCacheKey(data);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let compressed;
    let compressedSize;

    try {
      switch (algorithm) {
        case 'lz-string':
          if (typeof LZString !== 'undefined') {
            compressed = LZString.compressToUTF16(dataString);
            compressedSize = compressed.length * 2; // UTF-16 usa 2 bytes por char
          } else {
            // Fallback sem compressão
            compressed = dataString;
            compressedSize = dataString.length;
          }
          break;

        case 'gzip':
          if (typeof pako !== 'undefined') {
            compressed = pako.gzip(dataString, { level: this.level });
            compressedSize = compressed.length;
          } else {
            compressed = dataString;
            compressedSize = dataString.length;
          }
          break;

        case 'deflate':
          if (typeof pako !== 'undefined') {
            compressed = pako.deflate(dataString, { level: this.level });
            compressedSize = compressed.length;
          } else {
            compressed = dataString;
            compressedSize = dataString.length;
          }
          break;

        default:
          compressed = dataString;
          compressedSize = dataString.length;
      }

      const result = {
        data: compressed,
        compressed: compressed !== dataString,
        algorithm,
        originalSize: dataString.length,
        compressedSize,
        ratio: compressedSize / dataString.length,
        timestamp: Date.now()
      };

      // Adicionar ao cache
      this.addToCache(cacheKey, result);

      return result;
    } catch (error) {
      console.warn('[DataCompressor] Erro na compressão:', error);
      return {
        data: dataString,
        compressed: false,
        originalSize: dataString.length,
        compressedSize: dataString.length,
        ratio: 1,
        error: error.message
      };
    }
  }

  // Descomprimir dados
  async decompress(compressedData, options = {}) {
    const {
      algorithm = this.algorithm
    } = options;

    if (!compressedData || typeof compressedData !== 'string') {
      return compressedData;
    }

    try {
      switch (algorithm) {
        case 'lz-string':
          if (typeof LZString !== 'undefined') {
            return JSON.parse(LZString.decompressFromUTF16(compressedData));
          }
          return JSON.parse(compressedData);

        case 'gzip':
          if (typeof pako !== 'undefined') {
            const decompressed = pako.ungzip(compressedData, { to: 'string' });
            return JSON.parse(decompressed);
          }
          return JSON.parse(compressedData);

        case 'deflate':
          if (typeof pako !== 'undefined') {
            const decompressed = pako.inflate(compressedData, { to: 'string' });
            return JSON.parse(decompressed);
          }
          return JSON.parse(compressedData);

        default:
          return JSON.parse(compressedData);
      }
    } catch (error) {
      console.warn('[DataCompressor] Erro na descompressão:', error);
      // Tentar parse sem descompressão
      try {
        return JSON.parse(compressedData);
      } catch {
        return compressedData;
      }
    }
  }

  // Gerar chave de cache baseada no conteúdo
  getCacheKey(data) {
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32-bit
    }
    return Math.abs(hash).toString(36);
  }

  // Gerenciamento de cache
  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remover entrada mais antiga
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clearCache() {
    this.cache.clear();
  }

  // Estatísticas de compressão
  getStats() {
    const stats = Array.from(this.cache.values());
    const totalOriginal = stats.reduce((sum, s) => sum + s.originalSize, 0);
    const totalCompressed = stats.reduce((sum, s) => sum + s.compressedSize, 0);
    const avgRatio = stats.length > 0 ? stats.reduce((sum, s) => sum + s.ratio, 0) / stats.length : 1;

    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      totalOriginalSize: totalOriginal,
      totalCompressedSize: totalCompressed,
      overallRatio: totalCompressed / totalOriginal,
      avgRatio,
      compressionSavings: totalOriginal - totalCompressed,
      compressionSavingsPercent: totalOriginal > 0 ? ((totalOriginal - totalCompressed) / totalOriginal) * 100 : 0
    };
  }

  // Otimizar algoritmo baseado nos dados
  optimizeFor(data) {
    const sample = JSON.stringify(data);

    // Testar diferentes algoritmos
    const algorithms = ['lz-string', 'gzip', 'deflate'];
    let bestAlgorithm = 'lz-string';
    let bestRatio = 1;

    algorithms.forEach(algorithm => {
      try {
        const test = this.compress(data, { algorithm, force: true });
        if (test.ratio < bestRatio) {
          bestRatio = test.ratio;
          bestAlgorithm = algorithm;
        }
      } catch {
        // Ignorar erro do algoritmo
      }
    });

    this.algorithm = bestAlgorithm;
    return bestAlgorithm;
  }
}

// Instância global
export const dataCompressor = new DataCompressor();

// Hook React para compressão automática
export function useDataCompression(options = {}) {
  const {
    autoCompress = true,
    algorithm = 'lz-string',
    minSize = 1000
  } = options;

  const [compressionStats, setCompressionStats] = useState(dataCompressor.getStats());

  const compress = useCallback(async (data, compressOptions = {}) => {
    const result = await dataCompressor.compress(data, {
      algorithm,
      ...compressOptions
    });

    // Atualizar estatísticas
    setCompressionStats(dataCompressor.getStats());

    return result;
  }, [algorithm]);

  const decompress = useCallback(async (compressedData, decompressOptions = {}) => {
    return await dataCompressor.decompress(compressedData, {
      algorithm,
      ...decompressOptions
    });
  }, [algorithm]);

  const optimize = useCallback((data) => {
    return dataCompressor.optimizeFor(data);
  }, []);

  return {
    compress,
    decompress,
    optimize,
    stats: compressionStats,
    clearCache: () => dataCompressor.clearCache()
  };
}

// Hook para armazenamento comprimido
export function useCompressedStorage(storageKey, options = {}) {
  const {
    storage = localStorage,
    compressLargeData = true,
    autoSave = true
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { compress, decompress } = useDataCompression(options);

  // Carregar dados
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const stored = storage.getItem(storageKey);
      if (!stored) {
        setData(null);
        return null;
      }

      const parsed = JSON.parse(stored);
      let decompressedData = parsed.data;

      // Descomprimir se necessário
      if (parsed.compressed) {
        decompressedData = await decompress(parsed.data, {
          algorithm: parsed.algorithm
        });
      }

      setData(decompressedData);
      return decompressedData;
    } catch (error) {
      console.error('[useCompressedStorage] Erro ao carregar:', error);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [storageKey, storage, decompress]);

  // Salvar dados
  const save = useCallback(async (newData) => {
    if (!autoSave) return;

    try {
      let dataToStore = { data: newData, compressed: false };

      // Comprimir se for grande
      if (compressLargeData) {
        const compressed = await compress(newData);
        if (compressed.compressed) {
          dataToStore = {
            data: compressed.data,
            compressed: true,
            algorithm: compressed.algorithm,
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
            ratio: compressed.ratio
          };
        }
      }

      storage.setItem(storageKey, JSON.stringify({
        ...dataToStore,
        timestamp: Date.now()
      }));

      setData(newData);
    } catch (error) {
      console.error('[useCompressedStorage] Erro ao salvar:', error);
      throw error;
    }
  }, [storageKey, storage, compress, compressLargeData, autoSave]);

  // Limpar dados
  const clear = useCallback(() => {
    storage.removeItem(storageKey);
    setData(null);
  }, [storageKey, storage]);

  return {
    data,
    loading,
    load,
    save,
    clear,
    setData: autoSave ? save : setData
  };
}

// Hook para compressão em tempo real durante digitação
export function useRealtimeCompression(text, options = {}) {
  const {
    debounceMs = 500,
    minLength = 100
  } = options;

  const [compressedText, setCompressedText] = useState('');
  const [compressionRatio, setCompressionRatio] = useState(1);
  const timeoutRef = useRef(null);

  const { compress } = useDataCompression();

  useEffect(() => {
    if (text.length < minLength) {
      setCompressedText(text);
      setCompressionRatio(1);
      return;
    }

    // Debounce da compressão
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await compress({ text }, { force: true });
        setCompressedText(result.data);
        setCompressionRatio(result.ratio);
      } catch {
        setCompressedText(text);
        setCompressionRatio(1);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, minLength, debounceMs, compress]);

  return {
    compressedText,
    compressionRatio,
    originalLength: text.length,
    compressedLength: compressedText.length
  };
}

// Utilitário para compressão de mensagens grandes
export function useMessageCompression() {
  const { compress, decompress } = useDataCompression({
    minSize: 2000, // Comprimir mensagens acima de 2KB
    algorithm: 'lz-string'
  });

  const compressMessage = useCallback(async (message) => {
    if (!message.content || message.content.length < 500) {
      return message; // Não comprimir mensagens pequenas
    }

    try {
      const compressed = await compress(message.content);
      if (compressed.compressed) {
        return {
          ...message,
          content: compressed.data,
          _compressed: true,
          _compressionInfo: {
            algorithm: compressed.algorithm,
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
            ratio: compressed.ratio
          }
        };
      }
    } catch (error) {
      console.warn('[useMessageCompression] Erro na compressão:', error);
    }

    return message;
  }, [compress]);

  const decompressMessage = useCallback(async (message) => {
    if (!message._compressed) {
      return message;
    }

    try {
      const decompressed = await decompress(message.content, {
        algorithm: message._compressionInfo?.algorithm
      });

      return {
        ...message,
        content: decompressed,
        _compressed: false
      };
    } catch (error) {
      console.warn('[useMessageCompression] Erro na descompressão:', error);
      return message;
    }
  }, [decompress]);

  return {
    compressMessage,
    decompressMessage
  };
}

// Compressão de dados de cache
export function useCacheCompression(cacheKey, options = {}) {
  const {
    compressThreshold = 5000, // bytes
    ttl = 24 * 60 * 60 * 1000 // 24 horas
  } = options;

  const storage = {
    get: (key) => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp > ttl) {
          localStorage.removeItem(key);
          return null;
        }

        return parsed;
      } catch {
        return null;
      }
    },

    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify({
          data: value,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('[useCacheCompression] Erro ao salvar cache:', error);
      }
    }
  };

  const { compress, decompress } = useDataCompression({
    minSize: compressThreshold
  });

  const get = useCallback(async (key = cacheKey) => {
    const cached = storage.get(key);
    if (!cached) return null;

    try {
      if (cached.compressed) {
        return await decompress(cached.data, {
          algorithm: cached.algorithm
        });
      }
      return cached.data;
    } catch {
      return null;
    }
  }, [cacheKey, storage, decompress]);

  const set = useCallback(async (value, key = cacheKey) => {
    try {
      const compressed = await compress(value);
      const dataToStore = compressed.compressed ? {
        data: compressed.data,
        compressed: true,
        algorithm: compressed.algorithm,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        timestamp: Date.now()
      } : {
        data: value,
        compressed: false,
        timestamp: Date.now()
      };

      storage.set(key, dataToStore);
    } catch (error) {
      console.warn('[useCacheCompression] Erro ao salvar:', error);
    }
  }, [cacheKey, compress, storage]);

  const clear = useCallback((key = cacheKey) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorar erro
    }
  }, [cacheKey]);

  return { get, set, clear };
}

// Hook para compressão de estado React
export function useCompressedState(initialValue, options = {}) {
  const [compressedData, setCompressedData] = useState('');
  const { compress, decompress } = useDataCompression(options);

  // Estado descomprimido
  const [value, setValue] = useState(() => {
    if (typeof initialValue === 'function') {
      return initialValue();
    }
    return initialValue;
  });

  // Comprimir quando o valor muda
  useEffect(() => {
    const compressValue = async () => {
      try {
        const result = await compress(value);
        setCompressedData(result.data);
      } catch {
        // Fallback para JSON.stringify
        setCompressedData(JSON.stringify(value));
      }
    };

    compressValue();
  }, [value, compress]);

  const setCompressedValue = useCallback(async (newValue) => {
    let actualValue;
    if (typeof newValue === 'function') {
      actualValue = newValue(value);
    } else {
      actualValue = newValue;
    }

    setValue(actualValue);
  }, [value]);

  return [value, setCompressedValue, compressedData];
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.DataCompressor = {
    stats: () => dataCompressor.getStats(),
    optimize: (data) => dataCompressor.optimizeFor(data),
    clearCache: () => dataCompressor.clearCache(),
    algorithms: ['lz-string', 'gzip', 'deflate']
  };
}
