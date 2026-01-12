/**
 * DebugService
 * Zero-dependency logging utility.
 * Foundation of the service layer - must not import other services.
 */
class DebugService {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  addLog(type, message, data = null) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      type,
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      data
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (import.meta.env.DEV) {
      const style = type === 'error' ? 'color: red' : type === 'success' ? 'color: green' : 'color: blue';
      console.log(`%c[${type.toUpperCase()}]`, style, message, data || '');
    }

    this.notify();
    return entry.id;
  }

  logInfo(message, data) { return this.addLog('info', message, data); }
  logError(error, context = '') { 
    return this.addLog('error', context, { 
      message: error?.message || error, 
      stack: error?.stack 
    }); 
  }
  logRequest(method, url, data) { return this.addLog('request', `${method} ${url}`, data); }
  logResponse(reqId, status, data, duration) { this.addLog('response', `Status ${status} (${duration}ms)`, { reqId, data }); }
  
  clear() {
    this.logs = [];
    this.notify();
  }
}

export const debugService = new DebugService();