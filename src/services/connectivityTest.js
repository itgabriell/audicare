import { API_ENDPOINTS, UAZAPI_ENDPOINTS } from '@/config/apiConfig';

/**
 * ConnectivityTestService
 * Comprehensive validation suite for backend connectivity.
 * Implements sequential testing, retry logic with exponential backoff,
 * and detailed error reporting.
 */
export const ConnectivityTestService = {
  /**
   * Main entry point to run all connectivity tests.
   * @returns {Promise<Object>} Comprehensive report
   */
  async runComprehensiveTest() {
    const report = {
      timestamp: new Date().toISOString(),
      status: 'pending',
      duration: 0,
      results: [],
      summary: { total: 0, passed: 0, failed: 0 }
    };

    const startTime = performance.now();
    console.group('🔍 Starting Comprehensive Connectivity Test');

    // Define Tests
    const tests = [
      {
        name: 'Core API Health',
        url: API_ENDPOINTS.HEALTH_CHECK,
        expectedStatus: 200,
        expectedBody: { status: 'ok', info: 'API online' },
        required: true,
        description: 'Verifies the main backend server is reachable.'
      },
      {
        name: 'WhatsApp Gateway Status',
        url: UAZAPI_ENDPOINTS.WA_GATEWAY_STATUS,
        expectedStatus: 200,
        expectedBody: { status: 'ok', detail: 'WhatsApp Gateway online' },
        required: true,
        description: 'Checks if the specific WhatsApp integration module is active.'
      },
      {
        name: 'UAZAPI Proxy Check',
        url: UAZAPI_ENDPOINTS.CHECK_STATUS,
        expectedStatus: 200,
        // Loose check for legacy endpoint
        validateBody: (body) => body && (body.status === 'ok' || body.status === 'connected'), 
        required: false,
        description: 'Legacy endpoint check for backward compatibility.'
      },
      {
        name: 'WhatsApp Contacts List',
        url: UAZAPI_ENDPOINTS.WA_CONTACTS,
        expectedStatus: 200,
        isArray: true, // Expects array response
        required: false, // Auth might fail this one, but connectivity should work
        description: 'Verifies database access and list retrieval.'
      }
    ];

    report.summary.total = tests.length;

    // Run Tests Sequentially
    for (const testConfig of tests) {
      const result = await this.runSingleTestWithRetry(testConfig);
      report.results.push(result);
      if (result.success) report.summary.passed++;
      else report.summary.failed++;
    }

    report.duration = Math.round(performance.now() - startTime);
    report.status = report.summary.failed === 0 ? 'success' : 'warning';
    
    if (report.results.some(r => r.isCriticalFailure)) {
      report.status = 'failure';
    }

    console.log('📊 Test Complete:', report);
    console.groupEnd();
    return report;
  },

  /**
   * Runs a single test with exponential backoff retry logic.
   */
  async runSingleTestWithRetry(config, maxRetries = 1) {
    let attempt = 0;
    let lastResult = null;

    while (attempt <= maxRetries) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 500; // 1s, 2s...
        await new Promise(r => setTimeout(r, delay));
      }

      lastResult = await this.executeTest(config);
      if (lastResult.success) return lastResult;
      
      // Don't retry 404s or 401s (permanent errors)
      if (lastResult.httpStatus === 404 || lastResult.httpStatus === 401) break;
      
      attempt++;
    }

    return lastResult;
  },

  /**
   * Executes the actual fetch and validation logic.
   */
  async executeTest(config) {
    const { name, url, expectedStatus, expectedBody, isArray, validateBody } = config;
    const start = performance.now();
    
    const result = {
      name,
      url,
      description: config.description,
      success: false,
      httpStatus: 0,
      latency: 0,
      errorType: null, // 'network', 'timeout', 'validation', 'http'
      message: '',
      details: null,
      corsValid: false,
      isCriticalFailure: false,
      timestamp: new Date().toISOString(),
      troubleshooting: []
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        mode: 'cors' // Enforce CORS check
      });

      clearTimeout(timeoutId);

      result.latency = Math.round(performance.now() - start);
      result.httpStatus = response.status;
      result.corsValid = true; // If we got here, CORS is at least permissive enough to allow the request

      // 1. HTTP Status Check
      if (response.status !== expectedStatus) {
        result.errorType = 'http';
        result.message = `Unexpected HTTP Status: ${response.status}`;
        
        if (response.status === 404) {
          result.message = 'Endpoint Not Found (404)';
          result.details = 'The URL path may be incorrect or the endpoint is not deployed.';
          result.troubleshooting.push('Verify the URL in apiConfig.js matches the backend route.');
          result.troubleshooting.push('Check if the backend service was recently redeployed.');
        } else if (response.status === 500) {
           result.message = 'Internal Server Error (500)';
           result.details = 'Backend crashed processing the request.';
           result.troubleshooting.push('Check server logs for exceptions.');
        } else if (response.status === 401 || response.status === 403) {
           result.message = 'Unauthorized (401/403)';
           result.troubleshooting.push('Check if your authentication token is valid.');
           result.troubleshooting.push('Try logging out and logging back in.');
        }
        
        if (config.required) result.isCriticalFailure = true;
        return result;
      }

      // 2. Body Parsing
      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        result.errorType = 'validation';
        result.message = 'Invalid JSON Response';
        result.details = `Received: ${text.substring(0, 100)}`;
        result.troubleshooting.push('Backend might be returning HTML (error page) instead of JSON.');
        return result;
      }

      // 3. Content Validation
      let isValid = true;
      let validationError = '';

      if (isArray) {
        if (!Array.isArray(data)) {
          isValid = false;
          validationError = 'Expected JSON Array';
        }
      } else if (validateBody) {
         if (!validateBody(data)) {
            isValid = false;
            validationError = 'Custom validation failed';
         }
      } else if (expectedBody) {
        // Shallow check of expected keys
        const keys = Object.keys(expectedBody);
        for (const key of keys) {
          if (data[key] !== expectedBody[key]) {
            isValid = false;
            validationError = `Mismatch at key '${key}'. Expected '${expectedBody[key]}', got '${data[key]}'`;
            break;
          }
        }
      }

      if (!isValid) {
        result.errorType = 'validation';
        result.message = 'Response Body Validation Failed';
        result.details = validationError;
        result.troubleshooting.push('Backend response format does not match client expectations.');
        return result;
      }

      // Success
      result.success = true;
      result.message = 'OK';
      return result;

    } catch (error) {
      result.latency = Math.round(performance.now() - start);
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        result.errorType = 'timeout';
        result.message = 'Request Timed Out (>8s)';
        result.details = 'Server took too long to respond.';
        result.troubleshooting.push('Check internet connection.');
        result.troubleshooting.push('Backend might be sleeping (cold start).');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        result.errorType = 'network';
        result.message = 'Network or CORS Error';
        result.details = 'Browser blocked the request or server is unreachable.';
        result.corsValid = false;
        result.troubleshooting.push('Check if VITE_API_BASE_URL is correct (no mixed content).');
        result.troubleshooting.push('Check Cross-Origin Resource Sharing (CORS) settings on server.');
        result.troubleshooting.push('Ensure you are not blocking requests with an ad blocker.');
      } else {
        result.errorType = 'unknown';
        result.message = error.message;
      }
      
      if (config.required) result.isCriticalFailure = true;
      return result;
    }
  }
};