require('dotenv').config();

// Mapear variáveis VITE para as usadas pelo backend (apenas para este teste)
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (!process.env.SUPABASE_SERVICE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    console.log("⚠️ Usando VITE_SUPABASE_ANON_KEY como Service Key fallback para teste...");
    process.env.SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

const { supabase } = require('./backend/lib/customSupabaseClient.cjs');

async function testSchema() {
    console.log("🔍 Testando Schema do Supabase...");

    // 1. Testar tabela 'repair_tickets'
    console.log("\n1. Testando tabela 'repair_tickets'...");
    const { data: repairs, error: repairError } = await supabase
        .from('repair_tickets')
        .select('*')
        .limit(1);

    if (repairError) {
        console.error("❌ Erro em 'repair_tickets':", repairError.message, repairError.details, repairError.hint);
    } else {
        console.log("✅ Tabela 'repair_tickets' existe. Colunas encontradas:", repairs.length > 0 ? Object.keys(repairs[0]) : "Tabela vazia (mas existe)");
    }

    // 2. Testar coluna 'status' em 'repair_tickets'
    if (!repairError) {
        console.log("   Testando select específico 'id, status, clinic_id'...");
        const { error: colError } = await supabase
            .from('repair_tickets')
            .select('id, status, clinic_id')
            .limit(1);

        if (colError) console.error("❌ Erro ao selecionar colunas:", colError.message);
        else console.log("✅ Colunas 'id', 'status', 'clinic_id' confirmadas.");
    }

    // 3. Testar tabela 'messages'
    console.log("\n2. Testando tabela 'messages'...");
    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (msgError) {
        console.error("❌ Erro em 'messages':", msgError.message, msgError.details, msgError.hint);
    } else {
        console.log("✅ Tabela 'messages' existe. Colunas encontradas:", messages.length > 0 ? Object.keys(messages[0]) : "Tabela vazia (mas existe)");
    }

    // 4. Testar coluna 'sender_type' em 'messages'
    if (!msgError) {
        console.log("   Testando select específico 'sender_type'...");
        const { error: colError } = await supabase
            .from('messages')
            .select('id, sender_type, clinic_id')
            .limit(1);

        if (colError) console.error("❌ Erro ao selecionar colunas:", colError.message);
        else console.log("✅ Colunas 'id', 'sender_type', 'clinic_id' confirmadas.");
    }
    // 5. Testar filtro por clinic_id em repair_tickets (simulando erro)
    console.log("\n3. Testando filtro por clinic_id em 'repair_tickets'...");
    // UUID fictício para teste de sintaxe
    const testClinicId = 'b82d5019-c04c-47f6-b9f9-673ca736815b';
    const { error: filterError } = await supabase
        .from('repair_tickets')
        .select('id')
        .eq('clinic_id', testClinicId)
        .limit(1);

    if (filterError) console.error("❌ Erro no filtro clinic_id:", filterError.message);
    else console.log("✅ Filtro clinic_id funcionou.");

    // 6. Testar filtros de status (neq)
    console.log("\n4. Testando filtros de status (neq) em 'repair_tickets'...");
    const { error: statusError } = await supabase
        .from('repair_tickets')
        .select('id')
        .neq('status', 'Concluído')
        .limit(1);

    if (statusError) console.error("❌ Erro no filtro status (neq):", statusError.message);
    else console.log("✅ Filtro status (neq) funcionou.");

    // 7. Testar filtro sender_type em messages
    console.log("\n5. Testando filtro sender_type em 'messages'...");
    const { error: typeError } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_type', 'ai')
        .limit(1);

    if (typeError) console.error("❌ Erro no filtro sender_type:", typeError.message);
    else console.log("✅ Filtro sender_type funcionou.");
}

testSchema();
