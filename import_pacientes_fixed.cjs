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

async function importPatientsCorrected() {
  console.log('🚀 Iniciando importação CORRETA de pacientes...');

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

          // Preparar telefones (múltiplos números)
          const phones = [];

          // Telefone fixo
          if (row['Telefone']) {
            const cleanPhone = row['Telefone'].replace(/\D/g, '');
            if (cleanPhone) {
              phones.push({
                phone: cleanPhone,
                phone_type: 'home',
                is_primary: phones.length === 0,
                is_whatsapp: false
              });
            }
          }

          // Celular/WhatsApp
          if (row['Celular']) {
            const cleanPhone = row['Celular'].replace(/\D/g, '');
            if (cleanPhone) {
              phones.push({
                phone: cleanPhone,
                phone_type: 'mobile',
                is_primary: phones.length === 0,
                is_whatsapp: true
              });
            }
          }

          // Função para formatar CPF/CNPJ
          const formatDocument = (cpf) => {
            if (!cpf) return null;
            const cleaned = cpf.replace(/\D/g, '');
            if (cleaned.length === 11) {
              // CPF
              return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else if (cleaned.length === 14) {
              // CNPJ
              return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            }
            return cleaned; // Retorna como está se não for CPF ou CNPJ válido
          };

          // Preparar dados completos do paciente
          const patientData = {
            clinic_id: clinicId,
            name: nome,
            cpf: row['CPF'] ? row['CPF'].replace(/\D/g, '') : null, // CPF apenas números
            email: row['Email'] || null,
            birthdate: row['Data de Nasc.'] ? moment(row['Data de Nasc.'], 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            gender: row['Gênero'] === 'Masculino' ? 'male' : row['Gênero'] === 'Feminino' ? 'female' : null,

            // Dados fiscais/endereço para notas fiscais
            document: formatDocument(row['CPF']), // CPF formatado para notas
            zip_code: row['Cep'] ? row['Cep'].replace(/\D/g, '') : null,
            street: row['Logradouro'] || null,
            number: row['Número'] || null,
            neighborhood: row['Bairro'] || null,
            city: row['Cidade'] || null,
            state: row['Estado'] || null,

            // Telefone principal (para compatibilidade)
            phone: phones.length > 0 ? phones[0].phone : null,

            // Notas com informações adicionais
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
              row['Rg'] ? `RG: ${row['Rg']} ${row['Orgão Emissor'] || ''} ${row['Data da Expedição'] || ''}` : '',
              row['País'] && row['País'] !== 'Brazil' ? `País: ${row['País']}` : '',
              row['Nacionalidade'] ? `Nacionalidade: ${row['Nacionalidade']}` : '',
              row['Naturalidade'] ? `Naturalidade: ${row['Naturalidade']}` : ''
            ].filter(Boolean).join(' | ') || null
          };

          // Inserir paciente
          const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert([patientData])
            .select()
            .single();

          if (patientError) {
            console.error(`❌ Erro ao inserir paciente ${nome}:`, patientError.message);
            errorCount++;
            continue;
          }

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

          // Criar contato WhatsApp vinculado ao paciente
          const primaryPhone = phones.find(p => p.is_whatsapp) || phones[0];
          if (primaryPhone) {
            const contactData = {
              clinic_id: clinicId,
              patient_id: patient.id,
              name: nome,
              phone: primaryPhone.phone,
              email: row['Email'] || null,
              cpf: row['CPF'] ? row['CPF'].replace(/\D/g, '') : null,
              birth_date: patientData.birthdate,
              gender: patientData.gender,
              address_street: row['Logradouro'] || null,
              address_number: row['Número'] || null,
              address_neighborhood: row['Bairro'] || null,
              address_city: row['Cidade'] || null,
              address_state: row['Estado'] || null,
              address_zip: row['Cep'] ? row['Cep'].replace(/\D/g, '') : null,
              address_country: 'Brazil',
              alternate_phone: phones.length > 1 ? phones[1].phone : null,
              channel_type: 'whatsapp',
              notes: [
                row['Observação'] || '',
                row['Particularidade do Paciente'] || '',
                `Importado em: ${new Date().toLocaleString('pt-BR')}`
              ].filter(Boolean).join(' | ') || null,
              created_at: new Date().toISOString()
            };

            // Verificar se contato já existe
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('clinic_id', clinicId)
              .eq('phone', primaryPhone.phone)
              .limit(1);

            if (!existingContact || existingContact.length === 0) {
              const { error: contactError } = await supabase
                .from('contacts')
                .insert([contactData]);

              if (contactError) {
                console.warn(`⚠️ Paciente criado mas erro no contato WhatsApp para ${nome}:`, contactError.message);
              }
            }
          }

          successCount++;
          if (successCount % 50 === 0) {
            console.log(`✅ ${successCount} pacientes importados...`);
          }

        } catch (err) {
          console.error(`❌ Erro ao processar linha:`, err.message);
          console.error(`Dados da linha:`, JSON.stringify(row, null, 2));
          errorCount++;
        }
      }

      console.log(`\n\n🏁 Importação finalizada!`);
      console.log(`✅ Sucessos: ${successCount}`);
      console.log(`⚠️ Pulados (já existem ou inválidos): ${skippedCount}`);
      console.log(`❌ Erros: ${errorCount}`);

      if (successCount > 0) {
        console.log(`\n🎉 Importação concluída com sucesso!`);
        console.log(`📊 Total processado: ${successCount + skippedCount + errorCount} registros`);
      }
    });
}

importPatientsCorrected();
