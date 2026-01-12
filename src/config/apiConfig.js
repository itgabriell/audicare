/**
 * API Configuration
 * Single source of truth for all API endpoints.
 * STRICTLY enforces HTTPS production URL to avoid mixed content and connection errors.
 */

// Helper to derive the correct API Base URL
const getBaseUrl = () => {
  // 1. Priority: VITE_API_BASE_URL from environment
  if (import.meta.env.VITE_API_BASE_URL) {
    if (import.meta.env.VITE_API_BASE_URL.includes('localhost')) {
      console.warn('⚠️ WARNING: VITE_API_BASE_URL is set to localhost. This will fail in production deployments.');
    }
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 2. Secondary: VITE_API_URL (legacy support)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 3. FINAL FALLBACK: Hardcoded Production URL
  return 'https://api.audicarefono.com.br';
};

export const API_BASE_URL = getBaseUrl();

// Common Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  USER_PROFILE: `${API_BASE_URL}/user/profile`,
  HEALTH_CHECK: `${API_BASE_URL}/health`,
};

// WhatsApp / UAZAPI Endpoints
// Todos os endpoints apontam para o backend na VPS (api.audicarefono.com.br)
export const UAZAPI_ENDPOINTS = {
  // Standard /api/wa Endpoints (Backend VPS)
  WA_GATEWAY_STATUS: `${API_BASE_URL}/api/wa/whatsapp-status`,
  WA_HEALTH_CHECK: `${API_BASE_URL}/api/wa/health-check`,
  WA_SEND_TEXT: `${API_BASE_URL}/api/wa/send-text`,
  WA_SEND_MEDIA: `${API_BASE_URL}/api/wa/send-media`,
  WA_CONTACTS: `${API_BASE_URL}/api/wa/contacts`,
  WA_CHAT_HISTORY: `${API_BASE_URL}/api/wa/chat-history`,
  
  // Webhook endpoint (recebe webhooks do UAZAPI)
  // Este endpoint é usado apenas para documentação/configuração no UAZAPI
  // O UAZAPI envia webhooks POST para este endpoint
  // Remove /api do final se existir, depois adiciona /api/wa/webhook
  WA_WEBHOOK: `${API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL.replace(/\/api$/, '')}/api/wa/webhook`,

  // Legacy / Utility Endpoints (deprecated - manter para compatibilidade)
  CHECK_STATUS: `${API_BASE_URL}/whatsapp-status`,
  GET_CONTACTS: `${API_BASE_URL}/whatsapp-contacts`,
  SEND_MESSAGE: `${API_BASE_URL}/whatsapp-send`,
};