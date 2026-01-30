const dotenv = require('dotenv');
const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERRO: Verifique as variáveis de ambiente');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeamento de status do CSV para o sistema
const STATUS_MAPPING = {
    'Agendado': 'scheduled',
    'Confirmado': 'confirmed',
    'Chegou': 'arrived',
    'Não compareceu': 'no_show',
    'Cancelado': 'cancelled'
};

// Mapeamento de tipos de consulta
const APPOINTMENT_TYPE_MAPPING = {
    'Primeira Agendamento/Avaliação': 'Consulta Inicial',
    'Retorno': 'Retorno',
    'Retorno pós compra': 'Retorno',
    'Ajuste': 'Ajuste',
    'Molde': 'Molde',
    'Revisão': 'Revisão'
};

// Mapeamento de usuários
const USER_MAPPING = {
    'Karine Ribeiro Dias Brandao': 'karine@audicare.com',
    'Gabriel Brandão': 'gabriel@audicare.com',
    'Patricia Felix': 'patricia@audicare.com'
};

async function getUserIdByEmail(email) {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Erro ao buscar usuários:', error);
        return null;
    }

    const user = data.users.find(u => u.email === email);
    return user ? user.id : null;
}

async function importAppointments() {
    console.log('🚀 Iniciando importação de agendamentos...');

    // 1. Pega ID da Clínica
    const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

    if (!clinic) {
        console.error('❌ Nenhuma clínica encontrada!');
        return;
    }
    const clinicId = clinic.id;
    console.log(`🏥 Importando para a Clínica ID: ${clinicId}`);

    // 2. Cache de usuários
    console.log('👥 Carregando usuários...');
    const userCache = {};
    for (const [name, email] of Object.entries(USER_MAPPING)) {
        const userId = await getUserIdByEmail(email);
        if (userId) {
            userCache[name] = userId;
            console.log(`✅ Usuário encontrado: ${name} -> ${userId}`);
        } else {
            console.log(`⚠️ Usuário não encontrado: ${name} (${email})`);
        }
    }

    const results = [];
    const CSV_FILE = 'AGENDAMENTOS1901.csv';

    // Ler CSV
    fs.createReadStream(CSV_FILE, { encoding: 'latin1' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`📂 CSV lido: ${results.length} agendamentos encontrados.`);

            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;
            let patientNotFoundCount = 0;

            for (const row of results) {
                try {
                    const pacienteNome = row['Paciente'] ? row['Paciente'].trim() : null;
                    const dataAgendamento = row['Data do Agendamento'] ? row['Data do Agendamento'].trim() : null;
                    const criadoPor = row['Criado por: '] ? row['Criado por: '].trim() : null;

                    if (!pacienteNome || !dataAgendamento) {
                        console.log(`⚠️ Linha inválida - Paciente: ${pacienteNome}, Data: ${dataAgendamento}`);
                        skippedCount++;
                        continue;
                    }

                    // 1. Encontrar contato/paciente pelo nome
                    // Primeiro tentar encontrar na tabela contacts diretamente
                    const { data: contacts, error: contactsError } = await supabase
                        .from('contacts')
                        .select('id, name')
                        .eq('clinic_id', clinicId)
                        .ilike('name', pacienteNome);

                    let contactId = null;
                    if (contacts && contacts.length > 0) {
                        // Tentar correspondência exata primeiro
                        const contatoExato = contacts.find(c => c.name.toLowerCase() === pacienteNome.toLowerCase());
                        if (contatoExato) {
                            contactId = contatoExato.id;
                        } else {
                            // Usar o primeiro encontrado
                            contactId = contacts[0].id;
                            console.log(`⚠️ Contato encontrado por similaridade: "${pacienteNome}" -> "${contacts[0].name}"`);
                        }
                    } else {
                        // Se não encontrou em contacts, tentar através de contact_relationships -> patients
                        const { data: relationships, error: relError } = await supabase
                            .from('contact_relationships')
                            .select(`
                                contact_id,
                                patients!inner(name)
                            `)
                            .eq('related_entity_type', 'patient')
                            .ilike('patients.name', pacienteNome);

                        if (!relError && relationships && relationships.length > 0) {
                            contactId = relationships[0].contact_id;
                            console.log(`✅ Contato encontrado via relacionamento: "${pacienteNome}"`);
                        }
                    }

                    if (!contactId) {
                        console.log(`❌ Paciente/contato não encontrado: ${pacienteNome}`);
                        patientNotFoundCount++;
                        continue;
                    }

                    // 2. Verificar se agendamento já existe
                    const startTime = moment(dataAgendamento, 'DD/MM/YYYY HH:mm').toISOString();
                    const { data: existing } = await supabase
                        .from('appointments')
                        .select('id')
                        .eq('clinic_id', clinicId)
                        .eq('contact_id', contactId)
                        .eq('start_time', startTime)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        console.log(`⚠️ Agendamento já existe para ${pacienteNome} em ${dataAgendamento}`);
                        skippedCount++;
                        continue;
                    }

                    // 3. Determinar status baseado nas colunas com ✓
                    let status = 'scheduled'; // padrão

                    if (row['Chegou'] === '✓') {
                        status = 'arrived';
                    } else if (row['Não compareceu'] === '✓') {
                        status = 'no_show';
                    } else if (row['Confirmado'] === '✓') {
                        status = 'confirmed';
                    } else if (row['Cancelado'] === '✓') {
                        status = 'cancelled';
                    } else if (row['Reagendado'] === '✓') {
                        status = 'rescheduled';
                    }

                    // 4. Mapear tipo de consulta (usar como title)
                    const tipoOriginal = row['Tipo de consulta'] ? row['Tipo de consulta'].trim() : '';
                    const title = APPOINTMENT_TYPE_MAPPING[tipoOriginal] || tipoOriginal;

                    // 5. Calcular end_time (assumir 30 minutos de duração padrão)
                    const endTime = moment(dataAgendamento, 'DD/MM/YYYY HH:mm').add(30, 'minutes').toISOString();

                    // 6. Preparar dados do agendamento na estrutura correta
                    const appointmentData = {
                        clinic_id: clinicId,
                        contact_id: contactId,
                        title: title,
                        start_time: startTime,
                        end_time: endTime,
                        status: status,
                        obs: `Importado do sistema antigo - Criado por: ${criadoPor || 'Desconhecido'} em ${row['Data de Criação'] || 'Data não informada'}`,
                        created_at: row['Data de Criação'] ?
                            moment(row['Data de Criação'], 'DD/MM/YYYY HH:mm').toISOString() :
                            new Date().toISOString()
                    };

                    // 7. Inserir agendamento
                    const { data: appointment, error: appointmentError } = await supabase
                        .from('appointments')
                        .insert([appointmentData])
                        .select()
                        .single();

                    if (appointmentError) {
                        console.error(`❌ Erro ao inserir agendamento para ${pacienteNome}:`, appointmentError.message);
                        errorCount++;
                        continue;
                    }

                    successCount++;
                    console.log(`✅ Agendamento importado: ${pacienteNome} - ${dataAgendamento} (${status})`);

                    if (successCount % 10 === 0) {
                        console.log(`📊 ${successCount} agendamentos importados...`);
                    }

                } catch (err) {
                    console.error(`❌ Erro ao processar linha:`, err.message);
                    console.error(`Dados da linha:`, JSON.stringify(row, null, 2));
                    errorCount++;
                }
            }

            console.log(`\n\n🏁 Importação de agendamentos finalizada!`);
            console.log(`✅ Sucessos: ${successCount}`);
            console.log(`⚠️ Pulados (já existem): ${skippedCount}`);
            console.log(`❌ Pacientes não encontrados: ${patientNotFoundCount}`);
            console.log(`❌ Erros: ${errorCount}`);

            const totalProcessed = successCount + skippedCount + patientNotFoundCount + errorCount;
            console.log(`📊 Total processado: ${totalProcessed} registros`);

            if (successCount === results.length) {
                console.log(`\n🎉 Todos os ${results.length} agendamentos foram importados com sucesso!`);
            } else if (successCount > 0) {
                console.log(`\n✅ ${successCount} agendamentos importados. Verifique os pacientes não encontrados.`);
            } else {
                console.log(`\n❌ Nenhum agendamento foi importado. Verifique os logs acima.`);
            }
        });
}

importAppointments();
