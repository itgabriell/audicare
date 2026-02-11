import { supabase } from '@/lib/customSupabaseClient';

export const testConnection = async () => {
    console.log("--- STARTING CONNECTION TEST ---");
    const start = Date.now();

    try {
        // 1. Simple Ping
        console.log("1. Testing health/ping...");
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        const pingTime = Date.now() - start;

        if (error) {
            console.error("❌ Connection Failed:", error);
            alert(`Falha na conexão com Supabase: ${error.message}`);
        } else {
            console.log(`✅ Connection Success (${pingTime}ms)`);
            alert(`Conexão OK! Tempo de resposta: ${pingTime}ms`);
        }

        // 2. Auth Session Check
        console.log("2. Checking Session...");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.error("❌ Auth Session Error:", sessionError);
        else console.log("✅ Auth Session Status:", sessionData.session ? "Active" : "None");

    } catch (e) {
        console.error("❌ CRTICAL ERROR:", e);
        alert("Erro crítico ao testar conexão. Verifique o console.");
    }
};
