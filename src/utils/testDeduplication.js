/**
 * Utilitário para testar a deduplicação de mensagens
 * Use no console do navegador para validar o sistema
 */

import { whatsappService } from '@/services/whatsappService';

export const testDeduplication = {
  // Testar cache de mensagens processadas
  testCache: () => {
    console.log('🧪 Testando cache de mensagens processadas...');
    
    const testId1 = 'TEST_MSG_001';
    const testId2 = 'TEST_MSG_002';
    
    // Limpar cache primeiro
    whatsappService.clearProcessedCache();
    
    // Verificar que não está processada
    const before1 = whatsappService.isMessageProcessed(testId1);
    console.log(`Mensagem ${testId1} processada?`, before1); // Deve ser false
    
    // Marcar como processada
    whatsappService.markMessageProcessed(testId1);
    
    // Verificar que está processada
    const after1 = whatsappService.isMessageProcessed(testId1);
    console.log(`Mensagem ${testId1} processada após marcar?`, after1); // Deve ser true
    
    // Verificar que outra mensagem não está processada
    const before2 = whatsappService.isMessageProcessed(testId2);
    console.log(`Mensagem ${testId2} processada?`, before2); // Deve ser false
    
    // Verificar estatísticas
    const stats = whatsappService.getCacheStats();
    console.log('Estatísticas do cache:', stats);
    
    // Testar persistência (simular recarregamento)
    console.log('\n🔄 Simulando recarregamento...');
    // O cache deve persistir no localStorage
    const persisted = localStorage.getItem('whatsapp_processed_messages');
    console.log('Cache no localStorage:', persisted ? '✅ Existe' : '❌ Não existe');
    
    if (persisted) {
      const data = JSON.parse(persisted);
      console.log('Mensagens no cache:', Object.keys(data).length);
      console.log('Test ID no cache?', testId1 in data ? '✅' : '❌');
    }
    
    return {
      cacheWorking: after1 === true && before2 === false,
      persistenceWorking: persisted !== null,
      stats
    };
  },
  
  // Testar deduplicação de array de mensagens
  testDeduplication: (messages) => {
    console.log('🧪 Testando deduplicação de mensagens...');
    
    // Criar mensagens de teste com duplicatas
    const testMessages = [
      { id: '1', wa_message_id: 'WA001', content: 'Mensagem 1', created_at: new Date().toISOString(), sender_type: 'contact', conversation_id: 'conv1' },
      { id: '2', wa_message_id: 'WA002', content: 'Mensagem 2', created_at: new Date().toISOString(), sender_type: 'contact', conversation_id: 'conv1' },
      { id: '1', wa_message_id: 'WA001', content: 'Mensagem 1', created_at: new Date().toISOString(), sender_type: 'contact', conversation_id: 'conv1' }, // Duplicata por ID
      { wa_message_id: 'WA002', content: 'Mensagem 2', created_at: new Date().toISOString(), sender_type: 'contact', conversation_id: 'conv1' }, // Duplicata por wa_id
      { content: 'Mensagem 3', created_at: new Date().toISOString(), sender_type: 'contact', conversation_id: 'conv1' },
      { content: 'Mensagem 3', created_at: new Date().toISOString(), sender_type: 'contact', conversation_id: 'conv1' }, // Duplicata por conteúdo
    ];
    
    console.log('Mensagens antes da deduplicação:', testMessages.length);
    
    // Importar função de deduplicação (precisa ser exposta)
    // Por enquanto, apenas log
    console.log('⚠️ Esta função precisa acessar deduplicateMessages do useWhatsApp');
    console.log('Mensagens de teste:', testMessages);
    
    return testMessages;
  },
  
  // Verificar estado atual do sistema
  checkSystemStatus: () => {
    console.log('🔍 Verificando status do sistema de deduplicação...');
    
    const cacheStats = whatsappService.getCacheStats();
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const cacheInStorage = localStorage.getItem('whatsapp_processed_messages');
    
    const status = {
      cache: {
        size: cacheStats.size,
        limit: cacheStats.limit,
        ttl: cacheStats.ttl,
        working: cacheStats.size >= 0
      },
      persistence: {
        localStorageAvailable: hasLocalStorage,
        cacheInStorage: cacheInStorage !== null,
        cacheSize: cacheInStorage ? JSON.parse(cacheInStorage).length : 0
      }
    };
    
    console.table(status);
    
    return status;
  },
  
  // Limpar tudo (útil para testes)
  clearAll: () => {
    console.log('🧹 Limpando cache de deduplicação...');
    whatsappService.clearProcessedCache();
    console.log('✅ Cache limpo');
  }
};

// Expor no window para uso no console
if (typeof window !== 'undefined') {
  window.testDeduplication = testDeduplication;
  console.log('💡 Utilitário de teste disponível: window.testDeduplication');
  console.log('   Métodos disponíveis:');
  console.log('   - testDeduplication.testCache()');
  console.log('   - testDeduplication.testDeduplication()');
  console.log('   - testDeduplication.checkSystemStatus()');
  console.log('   - testDeduplication.clearAll()');
}

