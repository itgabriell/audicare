import { API_BASE_URL } from '@/config/apiConfig';

/**
 * Simple utility to test API connectivity in the browser console.
 * Usage: import { testApiConnection } from '@/utils/apiTest'; testApiConnection();
 */
export async function testApiConnection() {
  console.group('🔌 API Connectivity Test');
  console.log('Target Base URL:', API_BASE_URL);
  
  const startTime = performance.now();
  
  try {
    // Attempt to fetch the health endpoint or root
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    if (response.ok) {
      console.log(`%c✅ SUCCESS (HTTP ${response.status}) - ${duration}ms`, 'color: green; font-weight: bold;');
    } else {
      console.warn(`%c⚠️ SERVER ERROR (HTTP ${response.status}) - ${duration}ms`, 'color: orange; font-weight: bold;');
    }
    
    try {
      const data = await response.json();
      console.log('Response Body:', data);
    } catch (e) {
      console.log('Response Text (Non-JSON):', await response.text());
    }

  } catch (error) {
    console.error(`%c❌ NETWORK ERROR: ${error.message}`, 'color: red; font-weight: bold;');
    console.log('Possible causes: CORS, Server Down, Wrong URL');
  } finally {
    console.groupEnd();
  }
}