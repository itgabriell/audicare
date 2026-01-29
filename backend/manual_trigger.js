
require('dotenv').config();
const automationManager = require('./services/AutomationManager.cjs');
const { supabase } = require('./lib/customSupabaseClient.cjs');

async function runManualTrigger() {
    console.log('🧪 Iniciando Teste Manual de Automação...');

    try {
        // 1. Pegar o último agendamento criado
        const { data: appointment, error } = await supabase
            .from('appointments')
            .select('id, created_at, patient_id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !appointment) {
            console.error('❌ Erro ao buscar último agendamento:', error?.message);
            return;
        }

        console.log(`📅 Último Agendamento encontrado: ID ${appointment.id} (Criado em: ${new Date(appointment.created_at).toLocaleString()})`);

        // 2. Disparar a automação manualmente
        console.log('▶️ Executando processAppointmentCreated...');
        const result = await automationManager.processAppointmentCreated(appointment.id);

        console.log('✅ Resultado:', JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('💥 Erro fatal no script:', err);
    }
}

runManualTrigger();
