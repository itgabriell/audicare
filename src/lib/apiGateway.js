// API Gateway para comunicação externa
// Centraliza chamadas para APIs, adiciona logging, retry, rate limiting

export class ApiGateway {
  constructor() {
    this.services = new Map();
    this.middlewares = [];
    this.rateLimiters = new Map();
  }

  /**
   * Registra um serviço externo
   */
  registerService(name, config) {
    this.services.set(name, {
      name,
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.headers || {},
      auth: config.auth,
      rateLimit: config.rateLimit,
    });
  }

  /**
   * Adiciona middleware global
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Faz uma requisição através do gateway
   */
  async request(serviceName, endpoint, options = {}) {
    const service = this.services.get(serviceName);

    if (!service) {
      throw new Error(`Serviço '${serviceName}' não registrado`);
    }

    // Aplicar rate limiting
    if (service.rateLimit) {
      await this.checkRateLimit(serviceName, service.rateLimit);
    }

    const url = `${service.baseURL}${endpoint}`;
    const requestOptions = this.buildRequestOptions(service, options);

    // Aplicar middlewares
    let processedOptions = requestOptions;
    for (const middleware of this.middlewares) {
      processedOptions = await middleware(processedOptions, { service, endpoint });
    }

    // Executar requisição com retry
    return this.executeWithRetry(url, processedOptions, service.retries);
  }

  /**
   * Constrói opções da requisição
   */
  buildRequestOptions(service, options) {
    const headers = {
      'Content-Type': 'application/json',
      ...service.headers,
      ...options.headers,
    };

    // Adicionar autenticação se configurada
    if (service.auth) {
      if (service.auth.type === 'bearer') {
        headers.Authorization = `Bearer ${service.auth.token}`;
      } else if (service.auth.type === 'basic') {
        const credentials = btoa(`${service.auth.username}:${service.auth.password}`);
        headers.Authorization = `Basic ${credentials}`;
      } else if (service.auth.type === 'api-key') {
        headers[service.auth.headerName || 'X-API-Key'] = service.auth.key;
      }
    }

    return {
      ...options,
      headers,
      timeout: service.timeout,
    };
  }

  /**
   * Executa requisição com lógica de retry
   */
  async executeWithRetry(url, options, maxRetries) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ApiGateway] ${options.method || 'GET'} ${url} (tentativa ${attempt + 1})`);

        const response = await fetch(url, {
          ...options,
          signal: options.signal || AbortSignal.timeout(options.timeout || 30000),
        });

        // Log da resposta
        console.log(`[ApiGateway] ${response.status} ${response.statusText}`);

        // Retry para erros 5xx ou problemas de rede
        if (response.status >= 500) {
          if (attempt < maxRetries) {
            await this.delay(this.calculateBackoffDelay(attempt));
            continue;
          }
        }

        // Para outros códigos, retornar resposta (mesmo erros 4xx)
        return response;

      } catch (error) {
        lastError = error;

        // Não retry para erros de timeout ou abort
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          break;
        }

        // Retry para outros erros se não for a última tentativa
        if (attempt < maxRetries) {
          await this.delay(this.calculateBackoffDelay(attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Calcula delay para backoff exponencial
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = 1000; // 1 segundo
    const maxDelay = 30000; // 30 segundos
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  }

  /**
   * Verifica rate limiting usando cache distribuído
   */
  async checkRateLimit(serviceName, rateLimit) {
    const { cacheManager } = await import('./cacheManager');

    const key = `ratelimit_${serviceName}`;
    const now = Date.now();
    const windowMs = rateLimit.windowMs || 60000; // 1 minuto padrão
    const maxRequests = rateLimit.maxRequests || 100;

    // Buscar dados atuais do cache
    const cachedLimiter = await cacheManager.get(key, {
      store: 'sessionStorage',
      ttl: windowMs
    });

    let limiter = cachedLimiter || {
      requests: [],
      maxRequests,
      windowMs,
      lastCleanup: now
    };

    // Limpar requests fora da janela se necessário
    if (now - limiter.lastCleanup > windowMs / 4) { // Cleanup a cada 1/4 da janela
      limiter.requests = limiter.requests.filter(timestamp =>
        now - timestamp < windowMs
      );
      limiter.lastCleanup = now;
    }

    // Verificar se atingiu o limite
    if (limiter.requests.length >= maxRequests) {
      const oldestRequest = Math.min(...limiter.requests);
      const waitTime = windowMs - (now - oldestRequest);

      throw new Error(
        `Rate limit excedido para ${serviceName}. Aguarde ${Math.ceil(waitTime / 1000)}s`
      );
    }

    // Registrar nova requisição
    limiter.requests.push(now);

    // Salvar no cache
    await cacheManager.set(key, limiter, {
      store: 'sessionStorage',
      ttl: windowMs
    });
  }

  /**
   * Métodos de conveniência para HTTP
   */
  async get(serviceName, endpoint, options = {}) {
    return this.request(serviceName, endpoint, { ...options, method: 'GET' });
  }

  async post(serviceName, endpoint, data, options = {}) {
    return this.request(serviceName, endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(serviceName, endpoint, data, options = {}) {
    return this.request(serviceName, endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(serviceName, endpoint, data, options = {}) {
    return this.request(serviceName, endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(serviceName, endpoint, options = {}) {
    return this.request(serviceName, endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instância global do API Gateway
export const apiGateway = new ApiGateway();

// Middlewares padrão
apiGateway.use(async (options, context) => {
  // Middleware de logging
  const startTime = Date.now();

  try {
    // Adicionar headers padrão
    options.headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
      ...options.headers,
    };

    return options;
  } finally {
    // Log após a requisição (não bloqueante)
    setTimeout(() => {
      const duration = Date.now() - startTime;
      console.log(`[ApiGateway] ${context.service.name}:${context.endpoint} - ${duration}ms`);
    }, 0);
  }
});

// Serviços pré-registrados
apiGateway.registerService('supabase', {
  baseURL: process.env.REACT_APP_SUPABASE_URL,
  auth: {
    type: 'bearer',
    token: process.env.REACT_APP_SUPABASE_ANON_KEY,
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minuto
  },
});

apiGateway.registerService('whatsapp', {
  baseURL: process.env.REACT_APP_WHATSAPP_API_URL,
  auth: {
    type: 'bearer',
    token: process.env.REACT_APP_WHATSAPP_API_KEY,
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000, // 1 minuto
  },
});

apiGateway.registerService('n8n', {
  baseURL: process.env.REACT_APP_N8N_WEBHOOK_URL,
  timeout: 60000, // 1 minuto para webhooks
  retries: 2,
});

apiGateway.registerService('analytics', {
  baseURL: process.env.REACT_APP_ANALYTICS_API_URL,
  auth: {
    type: 'api-key',
    headerName: 'X-Analytics-Key',
    key: process.env.REACT_APP_ANALYTICS_API_KEY,
  },
});

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.ApiGateway = {
    get: (service, endpoint) => apiGateway.get(service, endpoint),
    post: (service, endpoint, data) => apiGateway.post(service, endpoint, data),
    services: () => Array.from(apiGateway.services.keys()),
    register: (name, config) => apiGateway.registerService(name, config),
  };
}
