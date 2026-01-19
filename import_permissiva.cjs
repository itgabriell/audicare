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

async function importacaoPermissiva() {
  console.log('🚀 Iniciando IMPORTAÇÃO PERMISSIVA...');

  // 1. Pega ID da Clínica
  const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

  if (!clinic) {
    console.error('❌ Nenhuma clínica encontrada!');
    return;
  }
  const clinicId = clinic.id;
  console.log(`🏥 Importando para a Clínica ID: ${clinicId}`);

  const results = [];
  const CSV_FILE = 'PACIENTES1901.csv';

  // Ler CSV com encoding correto
  fs.createReadStream(CSV_FILE, { encoding: 'utf8' })
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`📂 CSV lido: ${results.length} linhas encontradas.`);

      if (results.length < 600) {
        console.log('⚠️ ALERTA: O arquivo tem apenas', results.length, 'linhas, mas você mencionou 691 linhas.');
        console.log('Verifique se o arquivo PACIENTES1901.xlsx foi convertido corretamente para pacientes.csv');
      }

      let patientsInserted = 0;
      let patientsUpdated = 0;
      let contactsCreated = 0;
      let patientsWithoutPhone = 0;
      let errorCount = 0;

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const lineNumber = i + 2; // +2 porque arrays começam em 0 e primeira linha é cabeçalho

        try {
          // Mapeamento robusto para colunas (considerando encoding issues)
          const getColumnValue = (possibleNames) => {
            for (const name of possibleNames) {
              if (row[name] !== undefined && row[name] !== '') {
                return row[name];
              }
            }
            return null;
          };

          const nome = getColumnValue(['Nome']);
          if (!nome || nome.trim() === '') {
            console.log(`⚠️ Linha ${lineNumber}: Nome vazio, pulando...`);
            continue;
          }

          // REGRA 1: SEMPRE CRIAR PACIENTE (mesmo sem telefone ou endereço)
          const cpfValue = getColumnValue(['CPF']);
          let patientId = null;
          let isUpdate = false;

          // Verificar se CPF já existe (para atualizar ou não duplicar)
          if (cpfValue) {
            const cpfClean = cpfValue.replace(/\D/g, '');
            if (cpfClean.length >= 11) {
              const { data: existingPatient } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('cpf', cpfClean)
                .limit(1);

              if (existingPatient && existingPatient.length > 0) {
                patientId = existingPatient[0].id;
                isUpdate = true;
              }
            }
          }

          // Preparar telefone (para o campo phone do patient)
          const celularValue = getColumnValue(['Celular']);
          const telefoneValue = getColumnValue(['Telefone']);

          let primaryPhone = null;
          if (celularValue) {
            const cleanCelular = celularValue.replace(/\D/g, '');
            if (cleanCelular.length >= 8) {
              primaryPhone = cleanCelular;
            }
          }
          if (!primaryPhone && telefoneValue) {
            const cleanTelefone = telefoneValue.replace(/\D/g, '');
            if (cleanTelefone.length >= 8) {
              primaryPhone = cleanTelefone;
            }
          }

          // Mapeamento de endereços (sempre salvar o que estiver disponível)
          const logradouro = getColumnValue(['Logradouro']);
          const numero = getColumnValue(['Número']);
          const bairro = getColumnValue(['Bairro']);
          const cidade = getColumnValue(['Cidade']);
          const estado = getColumnValue(['Estado']);
          const cep = getColumnValue(['Cep']);

          // Preparar dados do paciente (sempre criar/atualizar)
          const patientData = {
            clinic_id: clinicId,
            name: nome.trim(),
            cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null,
            email: getColumnValue(['Email']) || null,
            birthdate: getColumnValue(['Data de Nasc.']) ? moment(getColumnValue(['Data de Nasc.']), 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            gender: getColumnValue(['Gênero']) === 'Masculino' ? 'male' : getColumnValue(['Gênero']) === 'Feminino' ? 'female' : null,

            // Endereços (sempre salvar o que estiver disponível)
            document: cpfValue ? cpfValue.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
            zip_code: cep ? cep.replace(/\D/g, '') : null,
            street: logradouro || null,
            number: numero || null,
            complement: null,
            neighborhood: bairro || null,
            city: cidade || null,
            state: estado || null,

            phone: primaryPhone,

            // Endereço concatenado
            address: [logradouro, numero, bairro, cidade, estado, cep].filter(Boolean).join(', ') || null,

            // Notas
            notes: [
              getColumnValue(['Observação']) || '',
              getColumnValue(['Particularidade do Paciente']) || '',
              getColumnValue(['Estado Civil']) ? `Estado Civil: ${getColumnValue(['Estado Civil'])}` : '',
              getColumnValue(['Nome da Mãe']) ? `Mãe: ${getColumnValue(['Nome da Mãe'])}` : '',
              getColumnValue(['Nome do Pai']) ? `Pai: ${getColumnValue(['Nome do Pai'])}` : '',
              getColumnValue(['Nome do Cônjugue']) ? `Cônjuge: ${getColumnValue(['Nome do Cônjugue'])}` : '',
              getColumnValue(['Renda']) ? `Renda: ${getColumnValue(['Renda'])}` : '',
              getColumnValue(['Renda Extra']) ? `Renda Extra: ${getColumnValue(['Renda Extra'])}` : '',
              getColumnValue(['Nome da Empresa']) ? `Empresa: ${getColumnValue(['Nome da Empresa'])}` : '',
              getColumnValue(['Cargo']) ? `Cargo: ${getColumnValue(['Cargo'])}` : '',
              getColumnValue(['Tempo no Cargo']) ? `Tempo no Cargo: ${getColumnValue(['Tempo no Cargo'])}` : '',
              getColumnValue(['Rg']) ? `RG: ${getColumnValue(['Rg'])} ${getColumnValue(['Orgão Emissor']) || ''} ${getColumnValue(['Data da Expedição']) || ''}` : '',
              getColumnValue(['País']) && getColumnValue(['País']) !== 'Brazil' ? `País: ${getColumnValue(['País'])}` : '',
              getColumnValue(['Nacionalidade']) ? `Nacionalidade: ${getColumnValue(['Nacionalidade'])}` : '',
              getColumnValue(['Naturalidade']) ? `Naturalidade: ${getColumnValue(['Naturalidade'])}` : '',
              `Importado da linha ${lineNumber} em: ${new Date().toLocaleString('pt-BR')}`
            ].filter(Boolean).join(' | ') || null
          };

          let result;
          if (isUpdate) {
            // Atualizar paciente existente
            result = await supabase
              .from('patients')
              .update(patientData)
              .eq('id', patientId)
              .select()
              .single();

            if (result.error) {
              console.error(`❌ Erro ao atualizar paciente ${nome}:`, result.error.message);
              errorCount++;
              continue;
            }
            patientsUpdated++;
          } else {
            // Criar novo paciente
            result = await supabase
              .from('patients')
              .insert([patientData])
              .select()
              .single();

            if (result.error) {
              console.error(`❌ Erro ao criar paciente ${nome}:`, result.error.message);
              errorCount++;
              continue;
            }
            patientId = result.data.id;
            patientsInserted++;
          }

          // REGRA 2: CRIAR CONTATO APENAS SE TIVER TELEFONE VÁLIDO
          if (primaryPhone && primaryPhone.length >= 8) {
            // Verificar se contato já existe
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('clinic_id', clinicId)
              .eq('phone', primaryPhone)
              .limit(1);

            if (!existingContact || existingContact.length === 0) {
              const contactData = {
                clinic_id: clinicId,
                patient_id: patientId,
                name: nome.trim(),
                phone: primaryPhone,
                email: getColumnValue(['Email']) || null,
                cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null,
                birth_date: patientData.birthdate,
                gender: patientData.gender,
                address_street: logradouro || null,
                address_number: numero || null,
                address_neighborhood: bairro || null,
                address_city: cidade || null,
                address_state: estado || null,
                address_zip: cep ? cep.replace(/\D/g, '') : null,
                address_country: getColumnValue(['País']) || 'Brazil',
                alternate_phone: null, // Não temos telefone alternativo
                channel_type: 'whatsapp',
                notes: [
                  getColumnValue(['Observação']) || '',
                  getColumnValue(['Particularidade do Paciente']) || '',
                  `Criado automaticamente - Linha ${lineNumber}`
                ].filter(Boolean).join(' | ') || null,
                created_at: new Date().toISOString()
              };

              const { error: contactError } = await supabase
                .from('contacts')
                .insert([contactData]);

              if (contactError) {
                console.warn(`⚠️ Paciente criado mas erro no contato para ${nome}:`, contactError.message);
              } else {
                contactsCreated++;
              }
            }
          } else {
            patientsWithoutPhone++;
          }

          if ((patientsInserted + patientsUpdated) % 50 === 0) {
            console.log(`✅ ${patientsInserted + patientsUpdated} pacientes processados... (linha ${lineNumber})`);
          }

        } catch (err) {
          console.error(`❌ Linha ${lineNumber} - Erro geral:`, err.message);
          errorCount++;
        }
      }

      // REGRA 3: LOGS REAIS
      console.log(`\n\n🏁 IMPORTAÇÃO PERMISSIVA FINALIZADA!`);
      console.log(`📊 RESULTADOS FINAIS:`);
      console.log(`   📄 Total de linhas no CSV: ${results.length}`);
      console.log(`   👥 Pacientes inseridos: ${patientsInserted}`);
      console.log(`   🔄 Pacientes atualizados: ${patientsUpdated}`);
      console.log(`   📞 Contatos WhatsApp criados: ${contactsCreated}`);
      console.log(`   📋 Pacientes sem telefone: ${patientsWithoutPhone}`);
      console.log(`   ❌ Erros: ${errorCount}`);

      const totalProcessed = patientsInserted + patientsUpdated + patientsWithoutPhone + errorCount;
      console.log(`   📈 Taxa de processamento: ${((totalProcessed / results.length) * 100).toFixed(1)}%`);

      if (results.length < 600) {
        console.log(`\n⚠️ IMPORTANTE: O arquivo CSV tem apenas ${results.length} linhas.`);
        console.log(`   Você mencionou 691 linhas. Verifique se o arquivo PACIENTES1901.xlsx`);
        console.log(`   foi convertido corretamente para pacientes.csv`);
      }

      console.log(`\n🎉 Sistema pronto com ${patientsInserted + patientsUpdated} pacientes!`);
    });
}

importacaoPermissiva();
