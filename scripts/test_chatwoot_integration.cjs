#!/usr/bin/env node

/**
 * Script de Teste da Integração Chatwoot
 * Testa todos os componentes da integração entre Audicare e Chatwoot
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.AUDICARE_API_URL || 'https://api.audicarefono.com.br';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  try {
    log(colors.blue, `🔍 Testando ${name}...`);
    const response = await axios.get(url, options);
    log(colors.green, `✅ ${name}: ${response.status} - OK`);
    return { success: true, data: response.data };
  } catch (error) {
    log(colors.red, `❌ ${name}: ${error.response?.status || 'ERRO'} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPostEndpoint(name, url, data, options = {}) {
  try {
    log(colors.blue, `🔍 Testando ${name}...`);
    const response = await axios.post(url, data, options);
    log(colors.green, `✅ ${name}: ${response.status} - OK`);
    return { success: true, data: response.data };
  } catch (error) {
    log(colors.red, `❌ ${name}: ${error.response?.status || 'ERRO'} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  log(colors.cyan, '🚀 Iniciando testes da Integração Chatwoot');
  log(colors.cyan, '=' .repeat(50));

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // 1. Health Check do Backend
  results.total++;
  const healthResult = await testEndpoint('Health Check Backend', `${BASE_URL}/health`);
  if (healthResult.success) results.passed++;
  else results.failed++;

  // 2. Health Check dos Webhooks
  results.total++;
  const webhookHealthResult = await testEndpoint('Health Check Webhooks', `${BASE_URL}/webhooks/health`);
  if (webhookHealthResult.success) results.passed++;
  else results.failed++;

  // 3. Health Check dos Webhooks Supabase
  results.total++;
  const supabaseHealthResult = await testEndpoint('Health Check Supabase Webhooks', `${BASE_URL}/webhooks/supabase/health`);
  if (supabaseHealthResult.success) results.passed++;
  else results.failed++;

  // 4. API de busca de pacientes (teste com telefone inexistente)
  results.total++;
  const patientSearchResult = await testEndpoint(
    'API Busca Paciente (telefone inexistente)',
    `${BASE_URL}/api/patients/search-by-phone?phone=11999999999`
  );
  if (patientSearchResult.success && patientSearchResult.data.success === false) {
    results.passed++;
    log(colors.green, `   ✅ Retornou corretamente "patient not found"`);
  } else {
    results.failed++;
    log(colors.red, `   ❌ Não retornou o resultado esperado`);
  }

  // 5. Teste do Webhook Supabase (teste endpoint)
  results.total++;
  const webhookTestResult = await testPostEndpoint(
    'Teste Webhook Supabase',
    `${BASE_URL}/webhooks/supabase/test`,
    { test: 'data', timestamp: new Date().toISOString() }
  );
  if (webhookTestResult.success) results.passed++;
  else results.failed++;

  // 6. Verificar se as rotas estão registradas (através do health check)
  if (webhookHealthResult.success && webhookHealthResult.data.endpoints) {
    log(colors.green, '📋 Endpoints disponíveis:');
    webhookHealthResult.data.endpoints.forEach(endpoint => {
      log(colors.yellow, `   • ${endpoint}`);
    });
  }

  if (supabaseHealthResult.success && supabaseHealthResult.data.endpoints) {
    log(colors.green, '📋 Endpoints Supabase disponíveis:');
    supabaseHealthResult.data.endpoints.forEach(endpoint => {
      log(colors.yellow, `   • ${endpoint}`);
    });
  }

  // Resultado Final
  log(colors.cyan, '=' .repeat(50));
  log(colors.cyan, '📊 RESULTADO DOS TESTES');

  log(colors.blue, `Total de testes: ${results.total}`);
  log(colors.green, `Aprovados: ${results.passed}`);
  if (results.failed > 0) {
    log(colors.red, `Reprovados: ${results.failed}`);
  }

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  if (results.failed === 0) {
    log(colors.green, `🎉 Taxa de sucesso: ${successRate}% - Todos os testes passaram!`);
  } else {
    log(colors.yellow, `⚠️  Taxa de sucesso: ${successRate}% - Alguns testes falharam.`);
    log(colors.yellow, 'Verifique os logs acima para detalhes.');
  }

  // Próximos passos
  log(colors.cyan, '\n📝 PRÓXIMOS PASSOS:');
  if (results.failed > 0) {
    log(colors.red, '1. Corrija os endpoints que falharam');
    log(colors.red, '2. Verifique as configurações no .env');
    log(colors.red, '3. Confirme se o backend está rodando');
  } else {
    log(colors.green, '1. ✅ Configure os webhooks no Supabase (veja CHATWOOT_INTEGRATION_API.md)');
    log(colors.green, '2. ✅ Configure os webhooks no Chatwoot');
    log(colors.green, '3. ✅ Aplique a migração 036_create_chatwoot_sync_triggers.sql');
    log(colors.green, '4. ✅ Teste a sincronização completa');
  }

  log(colors.blue, '\n🔗 URLs importantes:');
  log(colors.blue, `   Backend: ${BASE_URL}`);
  log(colors.blue, `   API Docs: ${BASE_URL}/api/patients/search-by-phone?phone=11999999999`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    log(colors.red, `💥 Erro fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };
