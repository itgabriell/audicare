import { supabase } from '@/lib/customSupabaseClient';
// We dynamically import whatsappService to prevent any potential cycles
// if integrationValidationService is imported by components that whatsappService might eventually touch (rare but safe)

class IntegrationValidationService {
  constructor() {
      this.history = [];
  }

  async runAllValidations() {
    const results = [];
    
    // 1. Auth Check
    try {
        const { data: { session } } = await supabase.auth.getSession();
        results.push({
            id: 'auth',
            name: 'Authentication',
            category: 'security',
            status: session ? 'pass' : 'fail',
            details: { user: session?.user?.email }
        });
    } catch (e) {
        results.push({ id: 'auth', name: 'Authentication', category: 'security', status: 'fail', details: { error: e.message } });
    }

    // 2. Service Check
    try {
        const { whatsappService } = await import('./whatsappService');
        const isConnected = await whatsappService.checkConnection();
        results.push({
            id: 'wa_connection',
            name: 'WhatsApp Connection',
            category: 'integration',
            status: isConnected ? 'pass' : 'warn',
            details: { connected: isConnected }
        });
    } catch (e) {
        results.push({ id: 'wa_connection', name: 'WhatsApp Connection', category: 'integration', status: 'fail', details: { error: e.message } });
    }

    // 3. Database Check
    try {
        const { error } = await supabase.from('contacts').select('count', { count: 'exact', head: true });
        results.push({
            id: 'db_access',
            name: 'Database Access',
            category: 'api',
            status: !error ? 'pass' : 'fail',
            details: { error: error?.message }
        });
    } catch (e) {
         results.push({ id: 'db_access', name: 'Database Access', category: 'api', status: 'fail', details: { error: e.message } });
    }

    const score = Math.round((results.filter(r => r.status === 'pass').length / results.length) * 100);
    
    this.history.unshift({
        timestamp: new Date(),
        score,
        summary: {
            passed: results.filter(r => r.status === 'pass').length,
            failed: results.filter(r => r.status === 'fail').length
        },
        results
    });
    
    return { results, score };
  }

  getHistory() {
      return this.history;
  }
}

export const integrationValidationService = new IntegrationValidationService();