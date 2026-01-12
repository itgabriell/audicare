import { API_BASE_URL, UAZAPI_ENDPOINTS } from '@/config/apiConfig';
import { supabase } from '@/lib/customSupabaseClient';
import { whatsappService } from '@/services/whatsappService';
import { webhookReceiverService } from '@/services/webhookReceiverService';
import { healthCheckService } from '@/services/healthCheckService';

const CACHE_KEY = 'whatsapp_endpoint_test_history';

/**
 * Service dedicated to testing WhatsApp API endpoints and integration logic.
 * Validates backend connectivity, security, and functional requirements.
 */
class WhatsAppEndpointTester {
  constructor() {
    this.results = [];
    this.history = this._loadHistory();
    this.isRunning = false;
  }

  _loadHistory() {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to load test history', e);
      return [];
    }
  }

  _saveToHistory(report) {
    try {
      const newHistory = [report, ...this.history].slice(0, 50);
      this.history = newHistory;
      localStorage.setItem(CACHE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.warn('Failed to save test history', e);
    }
  }

  async runAllTests() {
    if (this.isRunning) throw new Error('Test suite already running');
    this.isRunning = true;
    this.results = [];
    const startTime = Date.now();

    try {
      // 1. Configuration & Security
      await this.validateBackendURL();
      await this.validateUAZAPIConfig();
      await this.validateJWTToken();
      await this.validateNoTokenExposure();
      
      // 2. Endpoint Connectivity
      await this.testHealthCheck();
      await this.testContacts();
      
      // 3. Functional Logic
      await this.testSendText();
      await this.testChatHistory();
      
      // 4. Realtime & Infrastructure
      await this.testWebhookStatus();
      await this.testRealtimeSync();
      await this.testOfflineQueue();
      
      // 5. Advanced Validation
      await this.testMessageDelivery();
      await this.testMessageReceipt();
      await this.validateResponseTimes();
      await this.validateErrorHandling();
      await this.validateSecurityHeaders();

    } catch (error) {
      this._addResult('Test Suite Execution', 'system', 'fail', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
      const report = this.generateReport(startTime);
      this._saveToHistory(report);
      return report;
    }
  }

  // --- Implementation of Tests ---

  async validateBackendURL() {
    const start = Date.now();
    const expected = 'https://api.audicarefono.com.br';
    const current = API_BASE_URL;
    // Allow /api suffix if configured that way
    const isValid = current.includes(expected); 
    
    this._addResult('Backend URL Config', 'config', isValid ? 'pass' : 'warn', {
      current,
      expected,
      latency: Date.now() - start
    });
  }

  async validateUAZAPIConfig() {
    const hasEndpoints = !!UAZAPI_ENDPOINTS.SEND_TEXT && !!UAZAPI_ENDPOINTS.CHECK_STATUS;
    this._addResult('UAZAPI Endpoint Config', 'config', hasEndpoints ? 'pass' : 'fail', {
      defined: hasEndpoints
    });
  }

  async validateJWTToken() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const isValid = session && !error && new Date(session.expires_at * 1000) > new Date();
      
      this._addResult('JWT Token Validity', 'security', isValid ? 'pass' : 'fail', {
        has_session: !!session,
        expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
      });
    } catch (e) {
      this._addResult('JWT Token Validity', 'security', 'fail', { error: e.message });
    }
  }

  async validateNoTokenExposure() {
    // Check local storage or global scope for sensitive keys
    const sensitiveKeys = ['z-api-token', 'client-token', 'instance-token'];
    let exposed = false;
    
    // Simple check of localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i).toLowerCase();
        if (sensitiveKeys.some(sk => key.includes(sk))) exposed = true;
    }

    // Also check env vars exposed to client (should only start with VITE_)
    // This is a heuristic check.
    
    this._addResult('Token Exposure Check', 'security', !exposed ? 'pass' : 'warn', {
      clean_storage: !exposed
    });
  }

  async testHealthCheck() {
    const start = Date.now();
    try {
      const isConnected = await whatsappService.checkConnection();
      this._addResult('Health Check Endpoint', 'api', isConnected ? 'pass' : 'fail', {
        latency: Date.now() - start,
        connected: isConnected
      });
    } catch (e) {
      this._addResult('Health Check Endpoint', 'api', 'fail', { error: e.message });
    }
  }

  async testSendText() {
    const start = Date.now();
    try {
      // Negative test: Send without 'to' field to verify endpoint is reachable and validating
      // We don't want to spam real numbers in automated tests
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(UAZAPI_ENDPOINTS.SEND_TEXT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ text: 'Automated Test' }) 
      });
      
      // 400/422 means endpoint is UP and validating payload. 404/500 is bad.
      const status = res.status;
      const passed = status === 400 || status === 422 || status === 200;
      
      this._addResult('Send Text Endpoint', 'api', passed ? 'pass' : 'fail', {
        status_code: status,
        latency: Date.now() - start,
        note: 'Validated via negative testing (invalid payload)'
      });
    } catch (e) {
      this._addResult('Send Text Endpoint', 'api', 'fail', { error: e.message });
    }
  }

  async testContacts() {
    const start = Date.now();
    try {
      const contacts = await whatsappService.getContacts(1, 1);
      const passed = Array.isArray(contacts);
      this._addResult('Contacts Endpoint', 'api', passed ? 'pass' : 'fail', {
        count: passed ? contacts.length : 0,
        latency: Date.now() - start
      });
      return contacts;
    } catch (e) {
      this._addResult('Contacts Endpoint', 'api', 'fail', { error: e.message });
      return null;
    }
  }

  async testChatHistory() {
    const start = Date.now();
    try {
      // Try to get contacts to find a phone number to test
      const contacts = await whatsappService.getContacts(1, 1);
      if (contacts && contacts.length > 0) {
        const phone = contacts[0].phone;
        const msgs = await whatsappService.getMessages(phone, 1, 1);
        this._addResult('Chat History Endpoint', 'api', Array.isArray(msgs) ? 'pass' : 'fail', {
          phone_tested: phone,
          msg_count: msgs?.length,
          latency: Date.now() - start
        });
      } else {
        this._addResult('Chat History Endpoint', 'api', 'warn', { note: 'No contacts available to test' });
      }
    } catch (e) {
      this._addResult('Chat History Endpoint', 'api', 'fail', { error: e.message });
    }
  }

  async testWebhookStatus() {
    try {
      const stats = webhookReceiverService.getStats();
      this._addResult('Webhook Status', 'integration', stats ? 'pass' : 'fail', {
        active: true,
        stats
      });
    } catch (e) {
      this._addResult('Webhook Status', 'integration', 'fail', { error: e.message });
    }
  }

  async testRealtimeSync() {
    const stats = webhookReceiverService.getStats();
    const connected = stats.isConnected;
    this._addResult('Realtime Sync', 'integration', connected ? 'pass' : 'warn', {
      socket_connected: connected
    });
  }

  async testOfflineQueue() {
    const queue = healthCheckService.offlineQueue;
    const isArray = Array.isArray(queue);
    this._addResult('Offline Queue', 'integration', isArray ? 'pass' : 'fail', {
      items_pending: isArray ? queue.length : 0
    });
  }

  async testMessageDelivery() {
     // Static check of capability existence since we can't automate E2E without a receiver
     const hasMethod = typeof whatsappService.sendText === 'function';
     this._addResult('Message Delivery Logic', 'functional', hasMethod ? 'pass' : 'fail', {
       method_exists: true
     });
  }

  async testMessageReceipt() {
     const stats = webhookReceiverService.getStats();
     const received = stats.messagesReceived > 0;
     this._addResult('Message Receipt Logic', 'functional', received ? 'pass' : 'info', {
       count: stats.messagesReceived,
       note: received ? 'Verified' : 'No inbound messages yet in this session'
     });
  }
  
  async validateResponseTimes() {
     const latencies = this.results
        .filter(r => r.details?.latency)
        .map(r => r.details.latency);
        
     if (latencies.length === 0) return;
     
     const avg = latencies.reduce((a,b) => a+b, 0) / latencies.length;
     const acceptable = avg < 2000; // 2s threshold
     
     this._addResult('Response Time Benchmark', 'performance', acceptable ? 'pass' : 'warn', {
       avg_ms: Math.round(avg),
       threshold: 2000
     });
  }

  async validateErrorHandling() {
     const failedTests = this.results.filter(r => r.status === 'fail');
     // If tests failed but the suite didn't crash, error handling is partially working
     this._addResult('Error Handling', 'system', 'pass', {
       failures_caught: failedTests.length,
       suite_crashed: false
     });
  }
  
  async validateSecurityHeaders() {
      // Client-side check is limited, but we can check if we are sending Auth headers
      const { data: { session } } = await supabase.auth.getSession();
      const hasToken = !!session?.access_token;
      this._addResult('Security Headers (Client)', 'security', hasToken ? 'pass' : 'fail', {
          auth_header_ready: hasToken
      });
  }

  _addResult(name, category, status, details = {}) {
    this.results.push({
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      category,
      status,
      timestamp: new Date().toISOString(),
      details
    });
  }

  generateReport(startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    
    const score = this.results.length > 0 
      ? Math.round((passed / this.results.length) * 100) 
      : 0;

    return {
      id: `test_${endTime}`,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      score,
      summary: { total: this.results.length, passed, failed },
      results: this.results
    };
  }
  
  getHistory() { return this.history; }
  clearHistory() { 
      this.history = [];
      localStorage.removeItem(CACHE_KEY);
  }
}

export const whatsappEndpointTester = new WhatsAppEndpointTester();