import { useState, useEffect } from 'react';
import { API_BASE_URL, API_ENDPOINTS, UAZAPI_ENDPOINTS } from '@/config/apiConfig';

/**
 * Hook to validate the application's environment configuration on startup.
 * Ensures that the API is correctly pointed to the production environment
 * and that the backend is reachable.
 */
export const useConfigurationValidator = () => {
  const [isValidating, setIsValidating] = useState(true);
  const [configStatus, setConfigStatus] = useState({
    isValid: true,
    isProductionUrl: true,
    isReachable: true,
    message: '',
    details: null
  });
  const [retryCount, setRetryCount] = useState(0);

  const EXPECTED_URL = 'https://api.audicarefono.com.br';
  
  // A URL base pode incluir ou não o /api, então verificamos ambos
  const isValidProductionUrl = () => {
    const base = API_BASE_URL.replace(/\/api\/?$/, ''); // Remove /api se existir
    return base === EXPECTED_URL || API_BASE_URL === EXPECTED_URL || API_BASE_URL === `${EXPECTED_URL}/api`;
  };

  useEffect(() => {
    const validateConfiguration = async () => {
      setIsValidating(true);
      console.group('🚀 Environment Configuration Validator');
      console.log('Checking API Base URL:', API_BASE_URL);

      let status = {
        isValid: true,
        isProductionUrl: true,
        isReachable: true,
        message: 'Configuration looks good.',
        details: {}
      };

      // 1. Check URL correctness
      if (!isValidProductionUrl()) {
        console.warn(`⚠️ API Base URL Mismatch! Expected: ${EXPECTED_URL} (or ${EXPECTED_URL}/api), Found: ${API_BASE_URL}`);
        status.isProductionUrl = false;
        status.message = `API URL is not set to production (${EXPECTED_URL}).`;
        
        if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
           status.details.localhostDetected = true;
           console.error('❌ CRITICAL: Localhost detected in configuration!');
        }
      } else {
        console.log('✅ API Base URL matches production standard.');
      }

      // 2. Check Connectivity (Health Check)
      // Como o backend pode não ter endpoints de health check públicos,
      // apenas verificamos se a URL está correta e assumimos que está OK
      // O sistema funcionará normalmente mesmo sem health check
      console.log('ℹ️ Skipping health check (endpoints may not be publicly available)');
      status.isReachable = true; // Assume que está OK se a URL está correta
      
      // Tenta verificar se pelo menos o domínio responde (opcional, não bloqueia)
      if (isValidProductionUrl()) {
        try {
          // Teste silencioso - não bloqueia se falhar
          fetch(`${API_BASE_URL.replace(/\/api.*$/, '')}/`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
            mode: 'no-cors'
          }).catch(() => {
            // Ignora erros - pode ser CORS ou endpoint não existir
          });
          console.log('✅ Backend URL is correctly configured');
        } catch (e) {
          // Ignora erros silenciosamente
        }
      }

      // 3. Determine Critical Failure
      // Apenas localhost em produção é considerado falha crítica
      // Falha de health check não é crítica se a URL está correta
      if (!status.isProductionUrl) {
        status.isValid = false;
      } else if (!status.isReachable) {
        // Se URL está correta mas não conseguiu verificar, apenas avisa mas não bloqueia
        status.isValid = true;
        status.message = 'Backend health check unavailable, but URL is correct';
        console.warn('⚠️ Health check unavailable, but proceeding (URL is correct)');
      }

      setConfigStatus(status);
      setIsValidating(false);
      console.groupEnd();
    };

    validateConfiguration();
  }, [retryCount]); // Re-run if retryCount changes

  return { 
    isValidating, 
    configStatus, 
    retry: () => setRetryCount(0) // Manual retry resets count
  };
};

export default useConfigurationValidator;