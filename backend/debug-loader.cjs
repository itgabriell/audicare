
const path = require('path');

console.log('🔍 Iniciando diagnóstico de carregamento do AutomationManager...');

try {
    console.log('1. Testando importação de dependências...');

    try {
        require('node-cron');
        console.log('✅ node-cron: OK');
    } catch (e) {
        console.error('❌ node-cron: FALHOU', e.message);
    }

    try {
        require('axios');
        console.log('✅ axios: OK');
    } catch (e) {
        console.error('❌ axios: FALHOU', e.message);
    }

    try {
        const supabasePath = path.resolve(__dirname, './lib/customSupabaseClient.cjs');
        console.log(`Testing import: ${supabasePath}`);
        require(supabasePath);
        console.log('✅ customSupabaseClient: OK');
    } catch (e) {
        console.error('❌ customSupabaseClient: FALHOU', e.message);
        console.error(e.stack);
    }

    try {
        const chatwootPath = path.resolve(__dirname, './services/ChatwootBackendService.cjs');
        console.log(`Testing import: ${chatwootPath}`);
        require(chatwootPath);
        console.log('✅ ChatwootBackendService: OK');
    } catch (e) {
        console.error('❌ ChatwootBackendService: FALHOU', e.message);
        console.error(e.stack);
    }

    console.log('2. Testando AutomationManager...');
    const manager = require('./services/AutomationManager.cjs');
    console.log('✅ AutomationManager carregado com sucesso!', manager);

} catch (error) {
    console.error('\n🔴 ERRO FATAL AO CARREGAR AUTOMATION MANAGER:');
    console.error(error.message);
    console.error('--- STACK TRACE ---');
    console.error(error.stack);
}
