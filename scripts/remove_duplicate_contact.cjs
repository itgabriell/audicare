#!/usr/bin/env node

/**
 * Script para remover contato duplicado com número errado
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_KEY não encontrada no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDuplicateContact() {
    const wrongContactId = 'ad797423-5c6b-4f9c-9787-ec1eeb2fe196';

    console.log('🗑️ Removendo contato duplicado com número errado...');

    try {
        // Primeiro, verificar se existem conversas associadas
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .eq('contact_id', wrongContactId);

        if (convError) {
            console.error('Erro ao verificar conversas:', convError);
            return;
        }

        if (conversations && conversations.length > 0) {
            console.log(`⚠️ Existem ${conversations.length} conversas associadas. Removendo conversas primeiro...`);

            // Remover mensagens das conversas
            for (const conv of conversations) {
                const { error: msgError } = await supabase
                    .from('messages')
                    .delete()
                    .eq('conversation_id', conv.id);

                if (msgError) {
                    console.warn(`⚠️ Erro ao remover mensagens da conversa ${conv.id}:`, msgError.message);
                }
            }

            // Remover conversas
            const { error: convDeleteError } = await supabase
                .from('conversations')
                .delete()
                .in('id', conversations.map(c => c.id));

            if (convDeleteError) {
                console.error('Erro ao remover conversas:', convDeleteError);
                return;
            }

            console.log('✅ Conversas removidas');
        }

        // Remover o contato
        const { error: deleteError } = await supabase
            .from('contacts')
            .delete()
            .eq('id', wrongContactId);

        if (deleteError) {
            console.error('❌ Erro ao remover contato:', deleteError);
        } else {
            console.log('✅ Contato duplicado removido com sucesso!');
            console.log('📞 O contato correto "Condorset Ferreira" permanece ativo');
        }

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    removeDuplicateContact();
}

module.exports = { removeDuplicateContact };
