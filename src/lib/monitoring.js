// Sistema de Monitoring e Observabilidade
// Error tracking, performance monitoring e analytics

class MonitoringService {
  constructor() {
    this.errors = [];
    this.performance = new Map();
    this.events = [];
    this.maxErrors = 100;
    this.maxEvents = 1000;
  }

  // Error Tracking
  captureError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };

    this.errors.push(errorData);

    // Manter apenas os erros mais recentes
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('[Monitoring] Error captured:', errorData);
    }

    // Enviar para serviço externo (Sentry, etc.)
    this.sendErrorToService(errorData);

    return errorData;
  }

  // Performance Monitoring
  startTiming(name, context = {}) {
    const startTime = performance.now();
    const id = `${name}_${Date.now()}_${Math.random()}`;

    this.performance.set(id, {
      name,
      startTime,
      context,
      marks: []
    });

    return id;
  }

  endTiming(id) {
    const endTime = performance.now();
    const timing = this.performance.get(id);

    if (!timing) {
      console.warn(`[Monitoring] Timing not found: ${id}`);
      return null;
    }

    const duration = endTime - timing.startTime;
    const completeTiming = {
      ...timing,
      endTime,
      duration,
      timestamp: new Date().toISOString(),
    };

    // Remover da memória ativa
    this.performance.delete(id);

    // Log performance
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Monitoring] Performance: ${timing.name} - ${duration.toFixed(2)}ms`, completeTiming);
    }

    // Enviar métricas de performance
    this.sendPerformanceMetric(completeTiming);

    return completeTiming;
  }

  markTiming(id, markName) {
    const timing = this.performance.get(id);
    if (timing) {
      timing.marks.push({
        name: markName,
        timestamp: performance.now(),
      });
    }
  }

  // Event Tracking
  trackEvent(eventName, properties = {}) {
    const event = {
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };

    this.events.push(event);

    // Manter apenas os eventos mais recentes
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Monitoring] Event: ${eventName}`, event);
    }

    // Enviar para analytics
    this.sendEventToAnalytics(event);
  }

  // User Journey Tracking
  trackPageView(page, properties = {}) {
    this.trackEvent('page_view', {
      page,
      ...properties,
    });
  }

  trackUserAction(action, target, properties = {}) {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties,
    });
  }

  trackError(errorType, error, properties = {}) {
    this.captureError(error, {
      type: errorType,
      ...properties,
    });
  }

  // Health Checks
  async healthCheck() {
    const checks = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Verificar conectividade com Supabase
    try {
      const supabaseCheck = await this.checkSupabaseConnection();
      checks.checks.supabase = supabaseCheck;
    } catch (error) {
      checks.checks.supabase = { status: 'error', error: error.message };
    }

    // Verificar performance
    checks.checks.performance = this.getPerformanceMetrics();

    // Verificar recursos do navegador
    checks.checks.browser = this.getBrowserMetrics();

    // Enviar health check
    this.sendHealthCheck(checks);

    return checks;
  }

  async checkSupabaseConnection() {
    const startTime = performance.now();

    try {
      // Tentar uma query simples
      const { data, error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      const duration = performance.now() - startTime;

      return {
        status: error ? 'error' : 'healthy',
        responseTime: duration,
        error: error?.message,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        responseTime: performance.now() - startTime,
      };
    }
  }

  getPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0];

    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
      largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime,
      cumulativeLayoutShift: performance.getEntriesByName('layout-shift').reduce((sum, entry) => sum + entry.value, 0),
    };
  }

  getBrowserMetrics() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      } : null,
    };
  }

  // Utility methods
  getCurrentUserId() {
    try {
      // Implementar baseado no contexto de auth
      return null; // TODO: integrar com contexto de autenticação
    } catch {
      return null;
    }
  }

  getSessionId() {
    try {
      // Gerar ou recuperar session ID
      let sessionId = sessionStorage.getItem('audicare_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('audicare_session_id', sessionId);
      }
      return sessionId;
    } catch {
      return null;
    }
  }

  // Integration methods (implementar com serviços externos)
  sendErrorToService(errorData) {
    // TODO: Implementar integração com Sentry, LogRocket, etc.
    if (process.env.REACT_APP_ERROR_TRACKING_URL) {
      fetch(process.env.REACT_APP_ERROR_TRACKING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silent fail
      });
    }
  }

  sendPerformanceMetric(metric) {
    // TODO: Implementar integração com analytics
    if (process.env.REACT_APP_PERFORMANCE_TRACKING_URL) {
      fetch(process.env.REACT_APP_PERFORMANCE_TRACKING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(() => {
        // Silent fail
      });
    }
  }

  sendEventToAnalytics(event) {
    // TODO: Implementar integração com Google Analytics, Mixpanel, etc.
    if (process.env.REACT_APP_ANALYTICS_URL) {
      fetch(process.env.REACT_APP_ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silent fail
      });
    }
  }

  sendHealthCheck(check) {
    // TODO: Implementar health check endpoint
    if (process.env.REACT_APP_HEALTH_CHECK_URL) {
      fetch(process.env.REACT_APP_HEALTH_CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check),
      }).catch(() => {
        // Silent fail
      });
    }
  }

  // Data export for debugging
  exportData() {
    return {
      errors: this.errors,
      performance: Array.from(this.performance.entries()),
      events: this.events.slice(-100), // Últimos 100 eventos
      timestamp: new Date().toISOString(),
    };
  }

  // Reset data
  reset() {
    this.errors = [];
    this.performance.clear();
    this.events = [];
  }
}

// Instância global
export const monitoring = new MonitoringService();

// React Error Boundary integration
export class MonitoringErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    monitoring.captureError(error, {
      componentStack: errorInfo.componentStack,
      boundary: 'MonitoringErrorBoundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Algo deu errado
          </h2>
          <p className="text-red-600 dark:text-red-300 mt-2">
            O erro foi reportado e será corrigido em breve.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance monitoring hooks
export function usePerformanceMonitoring(name) {
  const timingId = React.useRef(null);

  React.useEffect(() => {
    timingId.current = monitoring.startTiming(name);

    return () => {
      if (timingId.current) {
        monitoring.endTiming(timingId.current);
      }
    };
  }, [name]);

  const mark = React.useCallback((markName) => {
    if (timingId.current) {
      monitoring.markTiming(timingId.current, markName);
    }
  }, []);

  return { mark };
}

// Error boundary hook
export function useErrorHandler() {
  return React.useCallback((error, context = {}) => {
    monitoring.captureError(error, context);
  }, []);
}

// Analytics hook
export function useAnalytics() {
  return React.useMemo(() => ({
    trackEvent: (eventName, properties) => monitoring.trackEvent(eventName, properties),
    trackPageView: (page, properties) => monitoring.trackPageView(page, properties),
    trackUserAction: (action, target, properties) => monitoring.trackUserAction(action, target, properties),
    trackError: (errorType, error, properties) => monitoring.trackError(errorType, error, properties),
  }), []);
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  window.Monitoring = {
    captureError: (error) => monitoring.captureError(error),
    startTiming: (name) => monitoring.startTiming(name),
    endTiming: (id) => monitoring.endTiming(id),
    trackEvent: (name, props) => monitoring.trackEvent(name, props),
    healthCheck: () => monitoring.healthCheck(),
    exportData: () => monitoring.exportData(),
    reset: () => monitoring.reset(),
  };
}
