// Axios replace by native fetch


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const uazapiService = {
    /**
     * Envia mensagem de confirmação diretamente via Uazapi (Bypass Chatwoot)
     * @param {string} phone - Telefone do paciente
     * @param {string} message - Mensagem personalizada
     */
    async sendConfirmationMessage(phone, message) {
        try {
            if (!phone) throw new Error('Telefone não fornecido');
            if (!message) throw new Error('Mensagem não fornecida');

            // Usa a rota do backend que criamos para mascarar a API Key
            const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone,
                    message
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Erro HTTP: ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('❌ Erro no envio Uazapi:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};
