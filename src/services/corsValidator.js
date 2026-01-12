/**
 * CORS Validation Service
 * 
 * NOTE: Browsers strictly limit access to CORS response headers (like Access-Control-Allow-Origin)
 * in client-side JavaScript for security reasons, unless the server explicitly sends
 * 'Access-Control-Expose-Headers'.
 * 
 * This validator tests functional access and inspects whatever headers are exposed.
 */

export const CorsValidator = {
  /**
   * Validates CORS for a given URL by attempting a fetch and inspecting the outcome.
   * @param {string} url - The endpoint to test
   * @param {object} options - Fetch options (method, headers)
   */
  async validateEndpoint(url, options = {}) {
    const startTime = performance.now();
    const report = {
      url,
      status: 'pending',
      isCorsOk: false,
      httpStatus: 0,
      headersFound: [],
      missingHeaders: [],
      latency: 0,
      error: null,
      suggestion: null
    };

    try {
      // We use GET (or user method) because OPTIONS is often handled automatically by browser preflight
      // and manual OPTIONS requests might be blocked or treated differently.
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        mode: 'cors', // Explicitly request CORS
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      report.latency = Math.round(performance.now() - startTime);
      report.httpStatus = response.status;
      report.isCorsOk = true; // If fetch didn't throw, CORS handshake succeeded (even if 404/500)
      report.status = 'ok';

      // Attempt to read headers (Browsers hide most unless exposed)
      const criticalHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers',
        'access-control-expose-headers'
      ];

      criticalHeaders.forEach(header => {
        const val = response.headers.get(header);
        if (val) {
          report.headersFound.push({ name: header, value: val });
        } else {
          report.missingHeaders.push(header);
        }
      });

      // Logic for warnings
      if (report.headersFound.length === 0) {
        console.warn(`[CORS] Endpoint ${url} succeeded, but no CORS headers were exposed to the client. This is normal if 'Access-Control-Expose-Headers' is missing.`);
      }

    } catch (error) {
      report.latency = Math.round(performance.now() - startTime);
      report.status = 'error';
      report.error = error.message;

      // Diagnosis based on error type
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        report.suggestion = "Possible CORS restriction. The server might be missing 'Access-Control-Allow-Origin' for this domain, or it's a network error/blocked request.";
      } else if (error.name === 'TimeoutError') {
        report.suggestion = "Request timed out. Server might be unreachable or preflight is stalling.";
      } else {
        report.suggestion = "Check network tab for detailed preflight (OPTIONS) failure details.";
      }
    }

    // Log details for debugging as requested
    console.groupCollapsed(`[CORS Validator] ${url}`);
    console.log('Status:', report.status);
    console.log('Latency:', report.latency, 'ms');
    console.log('Headers Found:', report.headersFound);
    console.log('Missing (Client-Side):', report.missingHeaders);
    if (report.error) console.error('Error:', report.error);
    console.groupEnd();

    return report;
  }
};