import axios from 'axios';
import { supabase } from '@/lib/customSupabaseClient';

import { API_BASE_URL } from '@/config/apiConfig';

// Endpoint base para WhatsApp (Backend VPS)
const WA_BASE_URL = `${API_BASE_URL}/api/wa`;

// Cache de mensagens processadas para evitar duplicação
// Usa Map para armazenar timestamp e permitir limpeza mais eficiente
// PERSISTENTE: Usa localStorage para sobreviver a recarregamentos
const STORAGE_KEY = 'whatsapp_processed_messages';
const CACHE_SIZE_LIMIT = 5000; // Aumentado para mais mensagens
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos (aumentado)

// Carregar cache do localStorage na inicialização
const loadCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const now = Date.now();
      const cache = new Map();
      
      // Filtrar apenas entradas válidas (dentro do TTL)
      Object.entries(data).forEach(([id, timestamp]) => {
        if (now - timestamp < CACHE_TTL) {
          cache.set(id, timestamp);
        }
      });
      
      return cache;
    }
  } catch (error) {
    console.warn('[whatsappService] Erro ao carregar cache do localStorage:', error);
  }
  return new Map();
};

const processedMessagesCache = loadCacheFromStorage();

// Salvar cache no localStorage periodicamente
const saveCacheToStorage = () => {
  try {
    const data = Object.fromEntries(processedMessagesCache);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[whatsappService] Erro ao salvar cache no localStorage:', error);
    // Se exceder o limite do localStorage, limpar cache antigo
    if (error.name === 'QuotaExceededError') {
      const entries = Array.from(processedMessagesCache.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, CACHE_SIZE_LIMIT / 2);
      processedMessagesCache.clear();
      entries.forEach(([id, timestamp]) => processedMessagesCache.set(id, timestamp));
    }
  }
};

// Limpar cache periodicamente (mensagens antigas e excesso)
setInterval(() => {
  const now = Date.now();
  const toDelete = [];
  
  // Remover entradas antigas (mais de 30 minutos)
  processedMessagesCache.forEach((timestamp, id) => {
    if (now - timestamp > CACHE_TTL) {
      toDelete.push(id);
    }
  });
  toDelete.forEach(id => processedMessagesCache.delete(id));
  
  // Se ainda estiver muito grande, remover as mais antigas
  if (processedMessagesCache.size > CACHE_SIZE_LIMIT) {
    const entries = Array.from(processedMessagesCache.entries())
      .sort((a, b) => a[1] - b[1]) // Ordenar por timestamp
      .slice(0, processedMessagesCache.size - CACHE_SIZE_LIMIT / 2);
    entries.forEach(([id]) => processedMessagesCache.delete(id));
  }
  
  // Salvar no localStorage
  saveCacheToStorage();
}, 60000); // A cada 1 minuto

// Salvar imediatamente quando adicionar nova mensagem
const originalMarkMessageProcessed = (messageId) => {
  if (messageId) {
    processedMessagesCache.set(String(messageId), Date.now());
    // Salvar imediatamente para mensagens críticas
    if (processedMessagesCache.size % 10 === 0) {
      saveCacheToStorage();
    }
  }
};

const getAuthHeaders = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      throw new Error('Erro ao verificar autenticação');
    }
    
    if (!session || !session.access_token) {
      throw new Error('Não autenticado. Por favor, faça login novamente.');
    }
    
    // Verificar se o token está expirado
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.warn('Token expirado, tentando renovar...');
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !newSession) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      return {
        'Authorization': `Bearer ${newSession.access_token}`,
        'Content-Type': 'application/json'
      };
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Erro em getAuthHeaders:', error);
    throw error;
  }
};

const service = {
  sendMessage: async (phone, message) => {
    try {
      // 1. Pega a sessão atual para extrair o Token JWT
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
          throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const cleanPhone = String(phone).replace(/\D/g, '');
      
      // 2. Envia para a VPS com o Cabeçalho de Autorização
      // Formato conforme backend: { "phone": "...", "message": "..." }
      const response = await axios.post(
        `${WA_BASE_URL}/send-text`,
        {
          phone: cleanPhone,
          message: message
        },
        {
          headers: {
              'Authorization': `Bearer ${session.access_token}`, // Token JWT do Supabase
              'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos de timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erro VPS:', error.response?.data || error.message);
      
      // Melhorar mensagens de erro
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 403) {
          throw new Error('Acesso negado. Verifique se você está autenticado corretamente.');
        } else if (status === 401) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        } else if (status === 500) {
          throw new Error('Erro interno do servidor. Tente novamente em alguns instantes.');
        } else if (status === 404) {
          throw new Error('Endpoint não encontrado. Verifique a configuração do backend.');
        } else {
          throw new Error(data?.message || data?.error || `Erro ao enviar mensagem (${status})`);
        }
      } else if (error.request) {
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
      } else {
        throw new Error(error.message || 'Erro desconhecido ao enviar mensagem');
      }
    }
  },

  sendMedia: async (phone, fileBlob, type = 'audio', caption = '') => {
    try {
      const cleanPhone = String(phone).replace(/\D/g, '');
      
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      
      // Upload para Supabase Storage primeiro
      const fileExt = type === 'audio' ? 'ogg' : fileBlob.type.split('/')[1] || 'bin';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `whatsapp-media/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, fileBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileBlob.type || `audio/${fileExt}`
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      // Enviar via API da VPS
      // Formato conforme backend: FormData com 'phone' em vez de 'to'
      // session já foi obtido acima, reutilizar
      if (!session) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const formData = new FormData();
      formData.append('phone', cleanPhone);
      formData.append('type', type);
      formData.append('url', publicUrl);
      if (caption) formData.append('caption', caption);

      const response = await axios.post(
        `${WA_BASE_URL}/send-media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            // Não definir Content-Type manualmente - axios define automaticamente com boundary
          },
          timeout: 60000 // 60 segundos para upload de arquivos
        }
      );

      return { ...response.data, media_url: publicUrl };
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      throw error;
    }
  },

  sendAudio: async (phone, audioBlob) => {
    return service.sendMedia(phone, audioBlob, 'audio');
  },

  checkHealth: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${WA_BASE_URL}/health-check`, { headers });
      return response.data;
    } catch (error) {
      return { status: 'offline', connected: false };
    }
  },

  // Verificar se mensagem já foi processada (anti-duplicação)
  isMessageProcessed: (messageId) => {
    if (!messageId) return false;
    const id = String(messageId);
    const timestamp = processedMessagesCache.get(id);
    if (!timestamp) return false;
    
    // Verificar se ainda está válido (dentro do TTL)
    const now = Date.now();
    if (now - timestamp > CACHE_TTL) {
      processedMessagesCache.delete(id);
      return false;
    }
    
    return true;
  },

  // Marcar mensagem como processada
  markMessageProcessed: (messageId) => {
    if (messageId) {
      const id = String(messageId);
      processedMessagesCache.set(id, Date.now());
      // Salvar no localStorage periodicamente
      if (processedMessagesCache.size % 10 === 0) {
        saveCacheToStorage();
      }
    }
  },
  
  // Limpar cache manualmente (útil para debug)
  clearProcessedCache: () => {
    processedMessagesCache.clear();
    localStorage.removeItem(STORAGE_KEY);
  },
  
  // Obter estatísticas do cache
  getCacheStats: () => {
    return {
      size: processedMessagesCache.size,
      limit: CACHE_SIZE_LIMIT,
      ttl: CACHE_TTL
    };
  },

  // Mock para evitar crash se chamarem errado
  getConversations: async () => []
};

export const whatsappService = service;
export default service;