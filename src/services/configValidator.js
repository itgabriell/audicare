import { API_BASE_URL, UAZAPI_ENDPOINTS } from '@/config/apiConfig';

/**
 * Service to validate system configuration and integration status
 */
const ConfigValidator = {
  /**
   * Generates a comprehensive system report
   */
  async generateReport() {
    const startTime = performance.now();
    
    // 1. Initialize Report Structure
    const report = {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE === 'production' ? 'Production' : 'Development',
      overallStatus: 'PASS',
      duration: 0,
      config: {
        baseUrl: API_BASE_URL,
        baseUrlValid: this.validateBaseUrl(API_BASE_URL),
        nodeEnv: import.meta.env.MODE
      },
      connectivity: {
        connected: false,
        latency: 0,
        status: 'unknown'
      },
      integrations: {
        whatsapp: 'unknown',
        uazapi: 'unknown'
      },
      details: {}
    };

    try {
      // 2. Basic Connectivity Check
      const healthStart = performance.now();
      try {
        const healthRes = await fetch(`${API_BASE_URL}/health`);
        report.connectivity.latency = Math.round(performance.now() - healthStart);
        report.connectivity.connected = healthRes.ok;
        report.connectivity.status = healthRes.ok ? 'online' : 'error';
        
        if (!healthRes.ok) {
          report.overallStatus = 'FAIL';
          report.details.connectivity = `Backend returned ${healthRes.status}`;
        }
      } catch (e) {
        report.connectivity.connected = false;
        report.connectivity.status = 'offline';
        report.overallStatus = 'CRITICAL';
        report.details.connectivity = 'Backend unreachable (Network Error)';
      }

      // 3. Config Validation
      if (!report.config.baseUrlValid) {
        report.overallStatus = report.overallStatus === 'PASS' ? 'WARN' : report.overallStatus;
        report.details.baseUrl = 'URL format warning (Using localhost or non-HTTPS)';
      }

    } catch (error) {
      report.overallStatus = 'FAIL';
      report.details.system = error.message;
    }

    report.duration = Math.round(performance.now() - startTime);
    return report;
  },

  validateBaseUrl(url) {
    if (!url) return false;
    // In production, we prefer HTTPS and no localhost
    if (import.meta.env.MODE === 'production') {
      return url.startsWith('https://') && !url.includes('localhost');
    }
    return true;
  }
};

export default ConfigValidator;