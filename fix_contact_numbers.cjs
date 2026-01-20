#!/usr/bin/env node

/**
 * Script para corrigir números de telefone incorretos nos contatos
 * Identifica números suspeitos e tenta encontrar o número correto
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

async function fixContactNumbers() {
    console.log('🔧 Iniciando correção de números de contato...\n');

    try {
        // 1. Buscar contatos com números suspeitos (muito longos)
        console.log('1. Buscando contatos com números suspeitos...');
        const { data: suspiciousContacts, error: searchError } = await supabase
            .from('contacts')
            .select('id, phone, name')
            .ilike('phone', '%55%') // Contém '55' (pode ser duplicado)
            .or('phone.not.ilike.55%,phone.gt.99999999999'); // Ou números muito longos

        if (searchError) {
            console.error('Erro ao buscar contatos:', searchError);
            return;
        }

        console.log(`Encontrados ${suspiciousContacts.length} contatos suspeitos\n`);

        // 2. Para cada contato suspeito, tentar corrigir
        let fixedCount = 0;
        let associatedCount = 0;

        for (const contact of suspiciousContacts) {
            console.log(`🔍 Processando: ${contact.name} - ${contact.phone}`);

            let correctedPhone = contact.phone;
            let foundPatient = false;

            // Tentar várias estratégias de correção
            const strategies = [
                // Estratégia 1: Remover duplicação de 55
                (phone) => {
                    if (phone.startsWith('55') && phone.length > 13) {
                        return phone.substring(2);
                    }
                    return phone;
                },
                // Estratégia 2: Procurar padrão brasileiro
                (phone) => {
                    // Procurar por 6196201651 dentro de strings longas
                    const matches = phone.match(/(\d{2}9\d{8})/g);
                    if (matches && matches.length > 0) {
                        return matches[0]; // Pega o primeiro match
                    }
                    return phone;
                },
                // Estratégia 3: Usar apenas os últimos 11 dígitos
                (phone) => {
                    if (phone.length > 11) {
                        return phone.substring(phone.length - 11);
                    }
                    return phone;
                }
            ];

            for (const strategy of strategies) {
                const testPhone = strategy(correctedPhone);
                if (testPhone !== correctedPhone && testPhone.length >= 10 && testPhone.length <= 11) {
                    console.log(`  ↳ Tentando correção: ${correctedPhone} → ${testPhone}`);

                    // Verificar se este número já existe como paciente
                    const { data: existingPatient } = await supabase
                        .from('patient_phones')
                        .select('patient_id, patients:id,name')
                        .eq('phone', testPhone)
                        .eq('is_whatsapp', true)
                        .maybeSingle();

                    if (existingPatient) {
                        console.log(`  ✅ Paciente encontrado: ${existingPatient.patients?.name}`);
                        correctedPhone = testPhone;
                        foundPatient = true;

                        // Atualizar contato com número correto e associação
                        const { error: updateError } = await supabase
                            .from('contacts')
                            .update({
                                phone: correctedPhone,
                                patient_id: existingPatient.patient_id
                            })
                            .eq('id', contact.id);

                        if (updateError) {
                            console.error(`  ❌ Erro ao atualizar contato: ${updateError.message}`);
                        } else {
                            console.log(`  🔗 Contato associado ao paciente!`);
                            fixedCount++;
                            associatedCount++;
                        }
                        break;
                    } else {
                        // Verificar na tabela patients (campo legado)
                        const { data: legacyPatient } = await supabase
                            .from('patients')
                            .select('id, name')
                            .eq('phone', testPhone)
                            .maybeSingle();

                        if (legacyPatient) {
                            console.log(`  ✅ Paciente encontrado (legado): ${legacyPatient.name}`);
                            correctedPhone = testPhone;
                            foundPatient = true;

                            // Atualizar contato
                            const { error: updateError } = await supabase
                                .from('contacts')
                                .update({
                                    phone: correctedPhone,
                                    patient_id: legacyPatient.id
                                })
                                .eq('id', contact.id);

                            if (updateError) {
                                console.error(`  ❌ Erro ao atualizar contato: ${updateError.message}`);
                            } else {
                                console.log(`  🔗 Contato associado ao paciente!`);
                                fixedCount++;
                                associatedCount++;
                            }
                            break;
                        }
                    }
                }
            }

            if (!foundPatient) {
                // Mesmo sem paciente, corrigir apenas o número se possível
                for (const strategy of strategies) {
                    const testPhone = strategy(contact.phone);
                    if (testPhone !== contact.phone && testPhone.length >= 10 && testPhone.length <= 11) {
                        console.log(`  ↳ Corrigindo apenas número: ${contact.phone} → ${testPhone}`);

                        const { error: updateError } = await supabase
                            .from('contacts')
                            .update({ phone: testPhone })
                            .eq('id', contact.id);

                        if (!updateError) {
                            fixedCount++;
                            console.log(`  ✅ Número corrigido!`);
                        } else {
                            console.error(`  ❌ Erro ao corrigir número: ${updateError.message}`);
                        }
                        break;
                    }
                }
            }

            console.log(''); // Linha em branco
        }

        console.log('📊 Resumo da correção:');
        console.log(`  - Contatos processados: ${suspiciousContacts.length}`);
        console.log(`  - Números corrigidos: ${fixedCount}`);
        console.log(`  - Associações realizadas: ${associatedCount}`);

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    fixContactNumbers();
}

module.exports = { fixContactNumbers };
