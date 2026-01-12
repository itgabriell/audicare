import { supabase } from '@/lib/customSupabaseClient';

/**
 * @typedef {'pending' | 'success' | 'failure'} CheckStatus
 * @typedef {{ name: string, status: CheckStatus, details: string }} CheckResult
 */

/**
 * Realiza uma série de verificações de saúde na integração com o Supabase.
 * @param {string} clinicId - O ID da clínica do usuário autenticado para testar RLS.
 * @returns {Promise<CheckResult[]>} Uma promessa que resolve para um array de resultados de verificação.
 */
export async function runSupabaseHealthCheck(clinicId) {
    const results = [
        { name: 'Conexão com Supabase', status: 'pending', details: 'Verificando a conectividade básica.' },
        { name: 'Política de RLS (Leitura)', status: 'pending', details: 'Tentando ler dados protegidos.' },
        { name: 'Assinatura Realtime', status: 'pending', details: 'Testando a conexão WebSocket.' },
    ];

    // 1. Teste de Conexão Básica (tentando buscar algo público ou a própria sessão)
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Nenhuma sessão ativa encontrada.');
        
        results[0].status = 'success';
        results[0].details = 'Conexão e autenticação com Supabase bem-sucedidas.';
    } catch (error) {
        results[0].status = 'failure';
        results[0].details = `Falha na conexão: ${error.message}. Verifique as variáveis de ambiente e a rede.`;
        // Se a conexão básica falhar, os outros testes também falharão.
        results[1].status = 'failure';
        results[1].details = 'Não foi possível testar RLS devido à falha de conexão.';
        results[2].status = 'failure';
        results[2  ].details = 'Não foi possível testar Realtime devido à falha de conexão.';
        return results;
    }

    // 2. Teste de Política de RLS
    try {
        if (!clinicId) throw new Error('ID da clínica não fornecido.');
        // Tenta ler uma conversa da clínica do usuário. Se RLS estiver correta, isso deve funcionar.
        // Se RLS estiver errada ou desativada, pode retornar dados de outras clínicas ou um erro de permissão.
        const { error } = await supabase.from('conversations').select('id').eq('clinic_id', clinicId).limit(1);
        if (error) throw error;

        results[1].status = 'success';
        results[1].details = 'Leitura de dados protegidos por RLS bem-sucedida.';
    } catch (error) {
        results[1].status = 'failure';
        results[1].details = `Falha no teste de RLS: ${error.message}. Verifique se as políticas de segurança foram aplicadas corretamente na tabela 'conversations'.`;
    }

    // 3. Teste de Assinatura Realtime
    try {
        const testChannelName = `health-check-${Date.now()}`;
        const status = await new Promise((resolve, reject) => {
            const channel = supabase.channel(testChannelName);
            
            const timeout = setTimeout(() => {
                supabase.removeChannel(channel);
                reject(new Error('Tempo limite de 10s excedido. Verifique a configuração do WebSocket e as políticas de rede.'));
            }, 10000);

            channel.subscribe((status, err) => {
                clearTimeout(timeout);
                if (status === 'SUBSCRIBED') {
                    supabase.removeChannel(channel);
                    resolve('success');
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
                    supabase.removeChannel(channel);
                    reject(err || new Error(`Status do canal: ${status}`));
                }
            });
        });

        if (status === 'success') {
            results[2].status = 'success';
            results[2].details = 'Assinatura de canal Realtime bem-sucedida.';
        } else {
            throw new Error('A assinatura não atingiu o estado "SUBSCRIBED".');
        }
    } catch (error) {
        results[2].status = 'failure';
        results[2].details = `Falha no teste de Realtime: ${error.message}`;
    }

    return results;
}

console.log("runSupabaseHealthCheck exported from supabaseHealthCheck.js");