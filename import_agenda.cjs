const dotenv = require('dotenv');
const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment');

dotenv.config();

// --- SUAS CHAVES AQUI ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://edqvmybfluxgrdhjiujf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERRO: Verifique as chaves do Supabase no código ou .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importPatients() {
  console.log('🚀 Iniciando importação de pacientes...');

  // 1. Pega ID da Clínica
  const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

  if (!clinic) {
    console.error('❌ Nenhuma clínica encontrada!');
    return;
  }
  const clinicId = clinic.id;
  console.log(`🏥 Importando para a Clínica ID: ${clinicId}`);

  const results = [];
  const CSV_FILE = 'pacientes.csv';

  // Ler CSV com encoding correto
  fs.createReadStream(CSV_FILE, { encoding: 'latin1' })
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`📂 CSV lido: ${results.length} linhas encontradas.`);

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const row of results) {
        try {
          const nome = row['Nome'] ? row['Nome'].trim() : null;
          if (!nome) {
            skippedCount++;
            continue;
          }

          // Verificar se já existe na tabela patients
          const { data: existing } = await supabase
            .from('patients')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('name', nome)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`⚠️ Paciente já existe: ${nome}`);
            skippedCount++;
            continue;
          }

          // Preparar telefones
          const phones = [];
          if (row['Telefone']) {
            phones.push({
              phone: row['Telefone'].replace(/\D/g, ''),
              phone_type: 'home',
              is_primary: phones.length === 0,
              is_whatsapp: false
            });
          }
          if (row['Celular']) {
            phones.push({
              phone: row['Celular'].replace(/\D/g, ''),
              phone_type: 'mobile',
              is_primary: phones.length === 0,
              is_whatsapp: true
            });
          }

          // Preparar dados do paciente (usando tabela patients)
          const patientData = {
            clinic_id: clinicId,
            name: nome,
            cpf: row['CPF'] ? row['CPF'].replace(/\D/g, '') : null,
            birthdate: row['Data de Nasc.'] ? moment(row['Data de Nasc.'], 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            gender: row['Gênero'] === 'Masculino' ? 'male' : row['Gênero'] === 'Feminino' ? 'female' : null,
            email: row['Email'] || null,
            phone: phones.length > 0 ? phones[0].phone : null,
            address: [
              row['Logradouro'],
              row['Número'],
              row['Bairro'],
              row['Cidade'],
              row['Estado'],
              row['Cep']
            ].filter(Boolean).join(', ') || null,
            notes: [
              row['Observação'] || '',
              row['Particularidade do Paciente'] || '',
              row['Estado Civil'] ? `Estado Civil: ${row['Estado Civil']}` : '',
              row['Nome da Mãe'] ? `Mãe: ${row['Nome da Mãe']}` : '',
              row['Nome do Pai'] ? `Pai: ${row['Nome do Pai']}` : '',
              row['Nome do Cônjugue'] ? `Cônjuge: ${row['Nome do Cônjugue']}` : '',
              row['Renda'] ? `Renda: ${row['Renda']}` : '',
              row['Renda Extra'] ? `Renda Extra: ${row['Renda Extra']}` : '',
              row['Nome da Empresa'] ? `Empresa: ${row['Nome da Empresa']}` : '',
              row['Cargo'] ? `Cargo: ${row['Cargo']}` : '',
              row['Tempo no Cargo'] ? `Tempo no Cargo: ${row['Tempo no Cargo']}` : '',
              row['Rg'] ? `RG: ${row['Rg']} ${row['Orgão Emissor'] || ''} ${row['Data da Expedição'] || ''}` : ''
            ].filter(Boolean).join(' | ') || null
          };

          // Inserir paciente
          const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert([patientData])
            .select()
            .single();

          if (patientError) throw patientError;

          // Inserir telefones se houver
          if (phones.length > 0 && patient.id) {
            const phonesToInsert = phones.map(phone => ({
              patient_id: patient.id,
              ...phone
            }));

            const { error: phonesError } = await supabase
              .from('patient_phones')
              .insert(phonesToInsert);

            if (phonesError) {
              console.warn(`⚠️ Erro ao inserir telefones para ${nome}:`, phonesError.message);
            }
          }

          // Agora criar contato WhatsApp vinculado ao paciente
          const contactData = {
            clinic_id: clinicId,
            patient_id: patient.id, // Vincular paciente ao contato
            name: nome,
            phone: phones.length > 0 ? phones[0].phone : null,
            email: row['Email'] || null,
            cpf: row['CPF'] ? row['CPF'].replace(/\D/g, '') : null,
            birth_date: row['Data de Nasc.'] ? moment(row['Data de Nasc.'], 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            gender: row['Gênero'] === 'Masculino' ? 'male' : row['Gênero'] === 'Feminino' ? 'female' : null,
            address_street: row['Logradouro'] || null,
            address_number: row['Número'] || null,
            address_neighborhood: row['Bairro'] || null,
            address_city: row['Cidade'] || null,
            address_state: row['Estado'] || null,
            address_zip: row['Cep'] ? row['Cep'].replace(/\D/g, '') : null,
            address_country: 'Brazil',
            alternate_phone: phones.length > 1 ? phones[1].phone : null,
            channel_type: 'whatsapp',
            notes: row['Observação'] || row['Particularidade do Paciente'] || null,
            created_at: new Date().toISOString()
          };

          // Inserir contato
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert([contactData])
            .select()
            .single();

          if (contactError) {
            console.warn(`⚠️ Paciente criado mas erro no contato WhatsApp para ${nome}:`, contactError.message);
          }

          successCount++;
          if (successCount % 50 === 0) {
            console.log(`✅ ${successCount} pacientes importados...`);
          }

        } catch (err) {
          console.error(`❌ Erro ao importar ${row['Nome']}:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n\n🏁 Importação finalizada!`);
      console.log(`✅ Sucessos: ${successCount}`);
      console.log(`⚠️ Pulados (já existem): ${skippedCount}`);
      console.log(`❌ Erros: ${errorCount}`);
    });
}

importPatients();
