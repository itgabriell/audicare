import { API_BASE_URL, API_ENDPOINTS, UAZAPI_ENDPOINTS } from '@/config/apiConfig';

const TEST_TIMEOUT_MS = 8000;

export const EndpointValidator = {
  /**
   * Runs the full suite of endpoint validations.
   * @returns {Promise<Object>} Detailed validation report
   */
  async runValidation() {
    const startTime = performance.now();
    const results = [];
    
    // Define Tests
    const tests = [
      {
        id: 'core-health',
        name: 'Core API Health',
        method: 'GET',
        url: API_ENDPOINTS.HEALTH_CHECK,
        expectedStatus: 200,
        validateResponse: (data) => data.status === 'ok' && data.info === 'API online',
        successCriteria: "Response must be exactly { status: 'ok', info: 'API online' }"
      },
      {
        id: 'wa-gateway',
        name: 'UAZAPI Gateway',
        method: 'GET',
        url: UAZAPI_ENDPOINTS.WA_GATEWAY_STATUS,
        expectedStatus: 200,
        validateResponse: (data) => data.status === 'ok' && data.detail === 'WhatsApp Gateway online',
        successCriteria: "Response must be { status: 'ok', detail: 'WhatsApp Gateway online' }"
      },
      {
        id: 'wa-integration',
        name: 'WhatsApp Integration',
        method: 'GET',
        url: UAZAPI_ENDPOINTS.CHECK_STATUS, // Legacy endpoint often used for integration check
        expectedStatus: 200,
        validateResponse: (data) => data && (data.status === 'ok' || data.status === 'connected'),
        successCriteria: "Response status must be 'ok' or 'connected'"
      },
      {
        id: 'wa-contacts',
        name: 'WhatsApp Contacts',
        method: 'GET',
        url: UAZAPI_ENDPOINTS.WA_CONTACTS,
        expectedStatus: 200,
        validateResponse: (data) => Array.isArray(data) || (data.results && Array.isArray(data.results)),
        successCriteria: "Response must be a JSON Array or contain a 'results' array"
      }
    ];

    // Execute Tests
    for (const test of tests) {
      const result = await this.testEndpoint(test);
      results.push(result);
    }

    const duration = Math.round(performance.now() - startTime);

    return {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      baseUrl: API_BASE_URL,
      duration,
      results
    };
  },

  /**
   * Execute a single endpoint test
   */
  async testEndpoint(testConfig) {
    const { id, name, url, method, expectedStatus, validateResponse, successCriteria } = testConfig;
    const start = performance.now();
    
    const result = {
      id,
      name,
      url,
      status: 'pending', // success, warning, error
      statusCode: null,
      latency: 0,
      responseBody: null,
      error: null,
      troubleshooting: [],
      corsHeaders: {}
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

      // Use 'cors' mode to ensure we test CORS headers
      const response = await fetch(url, {
        method,
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      
      result.latency = Math.round(performance.now() - start);
      result.statusCode = response.status;

      // 1. Status Code Check
      if (response.status !== expectedStatus) {
        result.status = 'error';
        result.error = `Unexpected HTTP Status: ${response.status}`;
        
        if (response.status === 404) {
          result.troubleshooting.push('Endpoint URL path is incorrect.');
          result.troubleshooting.push('The backend service might not have this route defined.');
        } else if (response.status >= 500) {
          result.troubleshooting.push('Internal Server Error. Check backend logs.');
        } else if (response.status === 401 || response.status === 403) {
          result.status = 'warning'; // Auth error is a warning for connectivity check (endpoint exists)
          result.error = 'Unauthorized (401/403)';
          result.troubleshooting.push('Authentication token is missing or invalid.');
        }
      }

      // 2. Body Parsing & Validation
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
        result.responseBody = data;
      } catch (e) {
        if (result.status !== 'error') {
           result.status = 'error';
           result.error = 'Response is not valid JSON';
           result.troubleshooting.push('Server might be returning an HTML error page.');
        }
        result.responseBody = text.slice(0, 200);
      }

      // 3. Content Logic Validation (only if no error yet)
      if (result.status !== 'error' && result.status !== 'warning') {
        if (!validateResponse(data)) {
          result.status = 'warning';
          result.error = `Content mismatch. Expected: ${successCriteria}`;
          result.troubleshooting.push('The API contract has changed.');
        } else {
          result.status = 'success';
        }
      }

      return result;

    } catch (error) {
      result.latency = Math.round(performance.now() - start);

      if (error.name === 'AbortError') {
        result.status = 'error';
        result.error = `Request timed out after ${TEST_TIMEOUT_MS}ms`;
        result.troubleshooting.push('Server is too slow or firewall is blocking requests.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        result.status = 'error';
        result.error = 'Network/CORS Error';
        result.troubleshooting.push('CORS policies might be blocking this origin.');
        result.troubleshooting.push('Verify VITE_API_BASE_URL matches server protocol (https/http).');
        result.troubleshooting.push('Ensure backend is running.');
      } else {
        result.status = 'error';
        result.error = error.message;
      }

      return result;
    }
  },
  
  async retrySingle(testId) {
     // Helper to run just one test logic
     // We reconstruct the test config from the ID
     // This is a simplified way; ideally config is shared.
     const fullReport = await this.runValidation();
     return fullReport.results.find(r => r.id === testId);
  }
};