// Sistema de Feature Flags para controle granular de funcionalidades
// Permite ativar/desativar features sem deploy

import { useState, useEffect } from 'react';

export const FEATURES = {
  // Notificações
  NOTIFICATIONS: 'notifications',
  NOTIFICATIONS_REALTIME: 'notifications_realtime',
  NOTIFICATIONS_SOUND: 'notifications_sound',

  // Dashboard
  DASHBOARD_ANALYTICS: 'dashboard_analytics',
  DASHBOARD_WIDGETS: 'dashboard_widgets',
  DASHBOARD_EXPORT: 'dashboard_export',

  // Pacientes
  PATIENTS_BULK_ACTIONS: 'patients_bulk_actions',
  PATIENTS_ADVANCED_SEARCH: 'patients_advanced_search',
  PATIENTS_EXPORT: 'patients_export',

  // Agendamentos
  APPOINTMENTS_CALENDAR_VIEW: 'appointments_calendar_view',
  APPOINTMENTS_BULK_EDIT: 'appointments_bulk_edit',
  APPOINTMENTS_REMINDERS: 'appointments_reminders',

  // Inbox/Chat
  INBOX_FILE_UPLOAD: 'inbox_file_upload',
  INBOX_VOICE_MESSAGES: 'inbox_voice_messages',
  INBOX_TEMPLATES: 'inbox_templates',

  // Relatórios
  REPORTS_ADVANCED: 'reports_advanced',
  REPORTS_SCHEDULED: 'reports_scheduled',
  REPORTS_EXPORT: 'reports_export',

  // Admin
  ADMIN_USER_MANAGEMENT: 'admin_user_management',
  ADMIN_AUDIT_LOG: 'admin_audit_log',
  ADMIN_BACKUP: 'admin_backup',

  // Experimental
  EXPERIMENTAL_AI_INSIGHTS: 'experimental_ai_insights',
  EXPERIMENTAL_VOICE_AI: 'experimental_voice_ai',
  EXPERIMENTAL_CHATBOT: 'experimental_chatbot',
};

// Configuração padrão das features
const DEFAULT_FEATURE_FLAGS = {
  // Features estáveis - sempre ativadas
  [FEATURES.NOTIFICATIONS]: true,
  [FEATURES.NOTIFICATIONS_REALTIME]: true,
  [FEATURES.DASHBOARD_WIDGETS]: true,

  // Features beta - podem ser desativadas se houver problemas
  [FEATURES.DASHBOARD_ANALYTICS]: true,
  [FEATURES.PATIENTS_ADVANCED_SEARCH]: true,
  [FEATURES.APPOINTMENTS_CALENDAR_VIEW]: true,
  [FEATURES.INBOX_FILE_UPLOAD]: true,

  // Features premium - podem ser controladas por plano
  [FEATURES.REPORTS_ADVANCED]: false,
  [FEATURES.ADMIN_AUDIT_LOG]: false,

  // Experimental - sempre desativadas por padrão
  [FEATURES.EXPERIMENTAL_AI_INSIGHTS]: false,
  [FEATURES.EXPERIMENTAL_VOICE_AI]: false,
  [FEATURES.EXPERIMENTAL_CHATBOT]: false,
};

// Cache das configurações
let featureFlagsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca as configurações de feature flags
 * Pode vir de: localStorage, API, Supabase, etc.
 */
async function fetchFeatureFlags() {
  // Verificar cache
  if (featureFlagsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return featureFlagsCache;
  }

  try {
    // Tentar buscar do localStorage primeiro (cache local)
    const localFlags = getLocalStorageFlags();

    // Em produção, buscar da API/Supabase
    if (process.env.NODE_ENV === 'production') {
      const serverFlags = await fetchServerFlags();
      if (serverFlags) {
        // Mesclar com configurações locais
        featureFlagsCache = { ...DEFAULT_FEATURE_FLAGS, ...localFlags, ...serverFlags };
      } else {
        featureFlagsCache = { ...DEFAULT_FEATURE_FLAGS, ...localFlags };
      }
    } else {
      // Em desenvolvimento, usar configurações locais + defaults
      featureFlagsCache = { ...DEFAULT_FEATURE_FLAGS, ...localFlags };
    }

    cacheTimestamp = Date.now();
    return featureFlagsCache;

  } catch (error) {
    console.warn('[FeatureFlags] Erro ao buscar configurações:', error);
    // Fallback para configurações padrão
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

/**
 * Busca flags do localStorage (override local)
 */
function getLocalStorageFlags() {
  try {
    const stored = localStorage.getItem('audicare_feature_flags');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Busca flags do servidor/API
 * Em produção, implementar chamada real para API
 */
async function fetchServerFlags() {
  // TODO: Implementar chamada real para API
  // Por enquanto, simula uma chamada
  try {
    // Simulação de chamada para API
    // const response = await fetch('/api/feature-flags');
    // return await response.json();

    return null; // Retorna null para usar defaults
  } catch {
    return null;
  }
}

/**
 * Verifica se uma feature está ativada
 */
export async function isFeatureEnabled(featureName) {
  const flags = await fetchFeatureFlags();
  return Boolean(flags[featureName]);
}

/**
 * Hook personalizado para usar feature flags em componentes
 */
export function useFeatureFlag(featureName) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isFeatureEnabled(featureName)
      .then(setIsEnabled)
      .finally(() => setLoading(false));
  }, [featureName]);

  return { isEnabled, loading };
}

/**
 * Componente condicional baseado em feature flag
 */
export function FeatureFlag({ feature, children, fallback = null }) {
  const { isEnabled, loading } = useFeatureFlag(feature);

  if (loading) {
    return null; // Ou um loading state
  }

  return isEnabled ? children : fallback;
}

/**
 * Atualiza uma feature flag localmente
 * Útil para desenvolvimento e testes
 */
export function setFeatureFlag(featureName, enabled) {
  try {
    const currentFlags = getLocalStorageFlags();
    const newFlags = { ...currentFlags, [featureName]: enabled };

    localStorage.setItem('audicare_feature_flags', JSON.stringify(newFlags));

    // Invalidar cache
    featureFlagsCache = null;
    cacheTimestamp = null;

    console.log(`[FeatureFlags] ${featureName}: ${enabled ? 'ativada' : 'desativada'}`);
  } catch (error) {
    console.error('[FeatureFlags] Erro ao salvar flag:', error);
  }
}

/**
 * Lista todas as features disponíveis com status
 */
export async function getAllFeatureFlags() {
  const flags = await fetchFeatureFlags();
  return Object.keys(FEATURES).map(key => ({
    name: key,
    enabled: flags[key] || false,
    description: getFeatureDescription(key)
  }));
}

/**
 * Descrição das features (para documentação)
 */
function getFeatureDescription(featureName) {
  const descriptions = {
    [FEATURES.NOTIFICATIONS]: 'Sistema de notificações push e em tempo real',
    [FEATURES.DASHBOARD_ANALYTICS]: 'Analytics avançado no dashboard com IA',
    [FEATURES.EXPERIMENTAL_AI_INSIGHTS]: 'Insights gerados por IA (experimental)',
    // Adicionar descrições para outras features...
  };

  return descriptions[featureName] || 'Funcionalidade sem descrição';
}

/**
 * Reset das configurações para padrão
 */
export function resetFeatureFlags() {
  try {
    localStorage.removeItem('audicare_feature_flags');
    featureFlagsCache = null;
    cacheTimestamp = null;
    console.log('[FeatureFlags] Configurações resetadas para padrão');
  } catch (error) {
    console.error('[FeatureFlags] Erro ao resetar flags:', error);
  }
}

// Exportar utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.FeatureFlags = {
    isEnabled: isFeatureEnabled,
    set: setFeatureFlag,
    reset: resetFeatureFlags,
    list: getAllFeatureFlags,
    FEATURES
  };
}
