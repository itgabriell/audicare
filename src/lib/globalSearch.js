import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { dataCompressor } from './dataCompressor';

// Sistema de busca global avançada
export class GlobalSearchEngine {
  constructor(options = {}) {
    this.index = new Map(); // Índice invertido
    this.documents = new Map(); // Documentos indexados
    this.searchCache = new Map(); // Cache de resultados
    this.maxCacheSize = options.maxCacheSize || 100;
    this.indexedTypes = options.indexedTypes || ['conversations', 'messages', 'contacts'];
  }

  // Indexar documento
  indexDocument(type, id, data, searchableFields = []) {
    const document = {
      id,
      type,
      data,
      searchableFields,
      indexedAt: Date.now(),
      lastModified: Date.now()
    };

    // Adicionar ao índice invertido
    const terms = this.extractTerms(searchableFields);
    terms.forEach(term => {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term).add(id);
    });

    this.documents.set(id, document);
  }

  // Atualizar documento indexado
  updateDocument(id, newData, searchableFields = []) {
    if (!this.documents.has(id)) {
      return false;
    }

    const document = this.documents.get(id);

    // Remover termos antigos
    const oldTerms = this.extractTerms(document.searchableFields);
    oldTerms.forEach(term => {
      const termSet = this.index.get(term);
      if (termSet) {
        termSet.delete(id);
        if (termSet.size === 0) {
          this.index.delete(term);
        }
      }
    });

    // Adicionar novos termos
    const newTerms = this.extractTerms(searchableFields);
    newTerms.forEach(term => {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term).add(id);
    });

    // Atualizar documento
    document.data = newData;
    document.searchableFields = searchableFields;
    document.lastModified = Date.now();

    return true;
  }

  // Remover documento do índice
  removeDocument(id) {
    if (!this.documents.has(id)) {
      return false;
    }

    const document = this.documents.get(id);
    const terms = this.extractTerms(document.searchableFields);

    // Remover de todos os termos
    terms.forEach(term => {
      const termSet = this.index.get(term);
      if (termSet) {
        termSet.delete(id);
        if (termSet.size === 0) {
          this.index.delete(term);
        }
      }
    });

    this.documents.delete(id);
    return true;
  }

  // Buscar documentos
  search(query, options = {}) {
    const {
      type = null, // Filtrar por tipo
      limit = 50,
      fuzzy = true,
      boostRecent = true
    } = options;

    // Verificar cache
    const cacheKey = `${query}_${type}_${limit}_${fuzzy}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const queryTerms = this.extractTerms([query]);
    const scoredResults = new Map();

    // Buscar por cada termo da query
    queryTerms.forEach(term => {
      const exactMatches = this.index.get(term);
      if (exactMatches) {
        exactMatches.forEach(docId => {
          const document = this.documents.get(docId);
          if (!document || (type && document.type !== type)) return;

          const score = this.calculateScore(document, term, queryTerms, boostRecent);
          scoredResults.set(docId, {
            document,
            score: (scoredResults.get(docId)?.score || 0) + score
          });
        });
      }

      // Busca fuzzy se habilitada
      if (fuzzy) {
        this.fuzzySearch(term).forEach(({ docId, similarity }) => {
          const document = this.documents.get(docId);
          if (!document || (type && document.type !== type)) return;

          const score = this.calculateScore(document, term, queryTerms, boostRecent) * similarity;
          scoredResults.set(docId, {
            document,
            score: (scoredResults.get(docId)?.score || 0) + score
          });
        });
      }
    });

    // Ordenar por score e limitar resultados
    const results = Array.from(scoredResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => ({
        ...result.document,
        searchScore: result.score
      }));

    // Adicionar ao cache
    this.addToCache(cacheKey, results);

    return results;
  }

  // Busca fuzzy (aproximada)
  fuzzySearch(term, maxDistance = 2) {
    const results = [];

    for (const [indexedTerm, docIds] of this.index.entries()) {
      const distance = this.levenshteinDistance(term, indexedTerm);
      if (distance <= maxDistance) {
        const similarity = 1 - (distance / Math.max(term.length, indexedTerm.length));
        docIds.forEach(docId => {
          results.push({ docId, similarity });
        });
      }
    }

    return results;
  }

  // Distância de Levenshtein para busca fuzzy
  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Calcular score de relevância
  calculateScore(document, matchedTerm, allTerms, boostRecent) {
    let score = 1;

    // Boost para termos exatos
    if (document.searchableFields.some(field =>
      field.toLowerCase().includes(matchedTerm)
    )) {
      score *= 2;
    }

    // Boost para documentos recentes
    if (boostRecent) {
      const daysSinceModified = (Date.now() - document.lastModified) / (1000 * 60 * 60 * 24);
      score *= Math.max(0.1, 1 - (daysSinceModified / 30)); // Boost decai em 30 dias
    }

    // Boost baseado no tipo de documento
    const typeBoosts = {
      contacts: 3,
      conversations: 2,
      messages: 1
    };
    score *= typeBoosts[document.type] || 1;

    return score;
  }

  // Extrair termos de busca
  extractTerms(fields) {
    const terms = new Set();

    fields.forEach(field => {
      if (!field || typeof field !== 'string') return;

      // Normalizar e dividir em palavras
      const normalized = field.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^\w\s]/g, ' ') // Remover pontuação
        .replace(/\s+/g, ' ') // Normalizar espaços
        .trim();

      normalized.split(' ').forEach(word => {
        if (word.length >= 2) { // Ignorar palavras muito curtas
          terms.add(word);
        }
      });
    });

    return Array.from(terms);
  }

  // Gerenciamento de cache
  addToCache(key, value) {
    if (this.searchCache.size >= this.maxCacheSize) {
      // Remover entrada mais antiga (FIFO)
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    this.searchCache.set(key, value);
  }

  // Limpar cache
  clearCache() {
    this.searchCache.clear();
  }

  // Estatísticas do índice
  getStats() {
    return {
      totalDocuments: this.documents.size,
      totalTerms: this.index.size,
      cacheSize: this.searchCache.size,
      documentsByType: Array.from(this.documents.values()).reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      }, {}),
      avgTermsPerDocument: this.documents.size > 0 ?
        Array.from(this.documents.values()).reduce((sum, doc) =>
          sum + this.extractTerms(doc.searchableFields).length, 0
        ) / this.documents.size : 0
    };
  }

  // Exportar/importar índice
  async exportIndex() {
    const data = {
      index: Array.from(this.index.entries()),
      documents: Array.from(this.documents.entries()),
      timestamp: Date.now()
    };

    return await dataCompressor.compress(data);
  }

  async importIndex(compressedData) {
    try {
      const data = await dataCompressor.decompress(compressedData.data);

      // Reconstruir índice
      this.index = new Map(data.index);
      this.documents = new Map(data.documents);

      return true;
    } catch (error) {
      console.error('[GlobalSearchEngine] Erro ao importar índice:', error);
      return false;
    }
  }

  // Limpeza completa
  clear() {
    this.index.clear();
    this.documents.clear();
    this.searchCache.clear();
  }
}

// Instância global
export const globalSearchEngine = new GlobalSearchEngine();

// Hook React para busca global
export function useGlobalSearch(options = {}) {
  const {
    autoIndex = true,
    indexTypes = ['conversations', 'messages', 'contacts'],
    debounceMs = 300
  } = options;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Indexar dados automaticamente
  useEffect(() => {
    if (!autoIndex) return;

    const indexData = async () => {
      try {
        // Indexar conversas
        if (indexTypes.includes('conversations')) {
          const { data: conversations } = await supabase
            .from('conversations')
            .select('id, contact:contacts(name, phone), last_message_preview')
            .limit(1000);

          conversations?.forEach(conv => {
            globalSearchEngine.indexDocument('conversations', conv.id, conv, [
              conv.contact?.name,
              conv.contact?.phone,
              conv.last_message_preview
            ]);
          });
        }

        // Indexar contatos
        if (indexTypes.includes('contacts')) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, name, phone, email')
            .limit(1000);

          contacts?.forEach(contact => {
            globalSearchEngine.indexDocument('contacts', contact.id, contact, [
              contact.name,
              contact.phone,
              contact.email
            ]);
          });
        }

        // Indexar mensagens recentes
        if (indexTypes.includes('messages')) {
          const { data: messages } = await supabase
            .from('messages')
            .select('id, content, conversation_id')
            .order('created_at', { ascending: false })
            .limit(5000);

          messages?.forEach(message => {
            globalSearchEngine.indexDocument('messages', message.id, message, [
              message.content
            ]);
          });
        }

      } catch (error) {
        console.error('[useGlobalSearch] Erro na indexação:', error);
      }
    };

    indexData();
  }, [autoIndex, indexTypes]);

  // Função de busca
  const search = useCallback(async (query, searchOptions = {}) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Debounce da busca
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      return new Promise((resolve) => {
        searchTimeoutRef.current = setTimeout(async () => {
          const searchResults = globalSearchEngine.search(query, {
            limit: 50,
            fuzzy: true,
            boostRecent: true,
            ...searchOptions
          });

          setResults(searchResults);
          setLoading(false);
          resolve(searchResults);
        }, debounceMs);
      });
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [debounceMs]);

  // Busca em tempo real
  const [realtimeQuery, setRealtimeQuery] = useState('');
  useEffect(() => {
    if (realtimeQuery) {
      search(realtimeQuery);
    } else {
      setResults([]);
    }
  }, [realtimeQuery, search]);

  // Atualizar documento no índice
  const updateIndex = useCallback((type, id, data, searchableFields) => {
    globalSearchEngine.updateDocument(id, data, searchableFields);
  }, []);

  // Remover documento do índice
  const removeFromIndex = useCallback((id) => {
    globalSearchEngine.removeDocument(id);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    realtimeQuery,
    setRealtimeQuery,
    updateIndex,
    removeFromIndex,
    stats: globalSearchEngine.getStats(),
    clearCache: () => globalSearchEngine.clearCache()
  };
}

// Hook para busca avançada com filtros
export function useAdvancedSearch(options = {}) {
  const {
    enableFilters = true,
    enableSorting = true
  } = options;

  const [filters, setFilters] = useState({
    type: 'all', // all, conversations, messages, contacts
    dateRange: 'all', // all, today, week, month, year
    hasAttachments: false,
    sender: '',
    channel: 'all'
  });

  const [sortBy, setSortBy] = useState('relevance'); // relevance, date, type

  const advancedSearch = useCallback(async (query, customFilters = {}) => {
    const searchFilters = { ...filters, ...customFilters };

    let searchOptions = {
      limit: 100,
      fuzzy: true,
      boostRecent: true
    };

    // Aplicar filtros
    if (searchFilters.type !== 'all') {
      searchOptions.type = searchFilters.type;
    }

    const results = await globalSearchEngine.search(query, searchOptions);

    // Filtrar resultados
    let filteredResults = results.filter(result => {
      // Filtro por data
      if (searchFilters.dateRange !== 'all') {
        const docDate = new Date(result.data.created_at || result.data.updated_at);
        const now = new Date();

        switch (searchFilters.dateRange) {
          case 'today':
            if (!isToday(docDate)) return false;
            break;
          case 'week':
            if (differenceInDays(now, docDate) > 7) return false;
            break;
          case 'month':
            if (differenceInDays(now, docDate) > 30) return false;
            break;
          case 'year':
            if (differenceInDays(now, docDate) > 365) return false;
            break;
        }
      }

      // Filtro por anexos
      if (searchFilters.hasAttachments) {
        if (result.type === 'messages') {
          if (!result.data.media_url && !result.data.message_type?.includes('file')) {
            return false;
          }
        } else {
          return false; // Só mensagens têm anexos
        }
      }

      // Filtro por canal
      if (searchFilters.channel !== 'all') {
        if (result.data.channel !== searchFilters.channel) {
          return false;
        }
      }

      return true;
    });

    // Ordenar resultados
    if (enableSorting) {
      filteredResults.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            const dateA = new Date(a.data.created_at || a.data.updated_at);
            const dateB = new Date(b.data.created_at || b.data.updated_at);
            return dateB - dateA;

          case 'type':
            return a.type.localeCompare(b.type);

          case 'relevance':
          default:
            return b.searchScore - a.searchScore;
        }
      });
    }

    return filteredResults;
  }, [filters, sortBy, enableSorting]);

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    advancedSearch
  };
}

// Hook para busca com autocomplete
export function useSearchAutocomplete(options = {}) {
  const {
    minQueryLength = 2,
    maxSuggestions = 5,
    debounceMs = 150
  } = options;

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  const getSuggestions = useCallback(async (query) => {
    if (!query || query.length < minQueryLength) {
      setSuggestions([]);
      return [];
    }

    setLoading(true);

    try {
      // Buscar termos similares no índice
      const terms = globalSearchEngine.extractTerms([query]);
      const lastTerm = terms[terms.length - 1];

      const suggestions = [];
      const seenTerms = new Set();

      // Encontrar termos que começam com o último termo digitado
      for (const [indexedTerm] of globalSearchEngine.index.entries()) {
        if (indexedTerm.startsWith(lastTerm) && !seenTerms.has(indexedTerm)) {
          seenTerms.add(indexedTerm);

          // Contar ocorrências
          const count = globalSearchEngine.index.get(indexedTerm).size;
          suggestions.push({
            term: indexedTerm,
            count,
            query: query.replace(new RegExp(`${lastTerm}$`), indexedTerm)
          });

          if (suggestions.length >= maxSuggestions) break;
        }
      }

      // Ordenar por frequência
      suggestions.sort((a, b) => b.count - a.count);

      setSuggestions(suggestions);
      setLoading(false);
      return suggestions;

    } catch (error) {
      console.error('[useSearchAutocomplete] Erro:', error);
      setSuggestions([]);
      setLoading(false);
      return [];
    }
  }, [minQueryLength, maxSuggestions]);

  const debouncedGetSuggestions = useCallback((query) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      getSuggestions(query);
    }, debounceMs);
  }, [getSuggestions, debounceMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    loading,
    getSuggestions,
    debouncedGetSuggestions
  };
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.GlobalSearch = {
    engine: globalSearchEngine,
    stats: () => globalSearchEngine.getStats(),
    search: (query) => globalSearchEngine.search(query),
    clear: () => globalSearchEngine.clear(),
    export: () => globalSearchEngine.exportIndex(),
    import: (data) => globalSearchEngine.importIndex(data)
  };
}
