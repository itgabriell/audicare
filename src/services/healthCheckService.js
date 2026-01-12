import { API_ENDPOINTS } from '@/config/apiConfig';

/**
 * Service to check the health of the backend API.
 * Includes polling capabilities and subscription management.
 */
class HealthCheckService {
  constructor() {
    this.listeners = new Set();
    this.intervalId = null;
    this.lastStatus = null;
    this.isPolling = false;
    this.defaultInterval = 30000; // 30 seconds
  }

  /**
   * Subscribe to health updates
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately notify with last known status if available
    if (this.lastStatus) {
      callback(this.lastStatus);
    }
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   * @param {Object} status 
   */
  notify(status) {
    this.lastStatus = status;
    this.listeners.forEach(cb => cb(status));
  }

  /**
   * Start periodic polling of the health endpoint
   * @param {number} intervalMs 
   */
  startPolling(intervalMs = this.defaultInterval) {
    if (this.isPolling) return;
    
    this.isPolling = true;
    // Initial check
    this.checkHealth();
    
    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, intervalMs);

    console.log('[HealthCheck] Polling started');
  }

  /**
   * Stop periodic polling
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log('[HealthCheck] Polling stopped');
  }

  /**
   * Checks if the backend is reachable and healthy.
   * @returns {Promise<{status: string, latency: number, timestamp: string}>}
   */
  async checkHealth() {
    const startTime = performance.now();
    try {
      const response = await fetch(API_ENDPOINTS.HEALTH_CHECK, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      let result;
      if (response.ok) {
        result = {
          status: 'online',
          latency,
          timestamp: new Date().toISOString(),
          code: response.status
        };
      } else {
        result = {
          status: 'error',
          latency,
          timestamp: new Date().toISOString(),
          code: response.status,
          message: `HTTP Error ${response.status}`
        };
      }
      
      this.notify(result);
      return result;

    } catch (error) {
      const endTime = performance.now();
      const result = {
        status: 'offline',
        latency: Math.round(endTime - startTime),
        timestamp: new Date().toISOString(),
        error: error.message
      };
      
      this.notify(result);
      return result;
    }
  }
}

// Export singleton instance to maintain state across components
export const healthCheckService = new HealthCheckService();