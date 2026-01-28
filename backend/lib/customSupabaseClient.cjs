const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
// Usa variáveis de ambiente estritas para evitar vazamento de chaves fallback em produção
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ [Backend] SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados. O cliente Supabase pode falhar.');
    // Não lançamos erro aqui para permitir que o servidor inicie e exiba logs, 
    // mas a funcionalidade de banco falhará se tentada.
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = { supabase };
