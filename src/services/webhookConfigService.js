import { API_BASE_URL } from '@/config/apiConfig';

/**
 * Frontend service to assist in configuring webhooks for UAZAPI.
 * The webhook endpoint is hosted on the backend VPS, not on Supabase.
 */
export const webhookConfigService = {
    /**
     * Returns the webhook URL for UAZAPI configuration.
     * This points to the backend VPS, not Supabase Edge Functions.
     */
    getWebhookUrl: () => {
        // Webhook é recebido diretamente pelo backend na VPS
        // Remove /api do final se existir, para obter a URL base
        const baseUrl = API_BASE_URL.endsWith('/api') 
            ? API_BASE_URL.slice(0, -4) 
            : API_BASE_URL.replace(/\/api$/, '');
        return `${baseUrl}/api/wa/webhook`;
    },

    /**
     * Tests if the webhook endpoint is reachable.
     * Note: This is a basic connectivity test. The webhook should accept POST requests.
     */
    testWebhookEndpoint: async () => {
        try {
            const url = webhookConfigService.getWebhookUrl();
            // Faz uma requisição OPTIONS ou HEAD para verificar se o endpoint existe
            // O backend pode retornar 405 (Method Not Allowed) ou 401 (Unauthorized),
            // mas isso indica que o endpoint existe e está respondendo
            const response = await fetch(url, {
                method: 'OPTIONS',
                mode: 'cors',
                headers: {
                    'Origin': window.location.origin,
                }
            });
            
            // Qualquer resposta (exceto CORS error) significa que o endpoint existe
            return response.status !== 0; // Status 0 = CORS error / network error
        } catch (e) {
            console.warn("Webhook endpoint test failed:", e);
            // Se der erro de CORS, ainda pode estar funcionando (backend pode não permitir OPTIONS)
            // Tentar verificar se a URL está correta
            const url = webhookConfigService.getWebhookUrl();
            return url.includes('api.audicarefono.com.br');
        }
    }
};