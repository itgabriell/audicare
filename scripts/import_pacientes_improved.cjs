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

async function importPatientsImproved() {
  console.log('🚀 Iniciando importação MELHORADA de pacientes...');

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
  fs.createReadStream(CSV_FILE, { encoding: 'utf8' })
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`📂 CSV lido: ${results.length} linhas encontradas.`);

      let successCount = 0;
      let errorCount = 0;
      let skippedEmptyName = 0;
      let skippedDuplicates = 0;
      let skippedErrors = 0;

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

          const nome = getColumnValue(['Nome']) ? getColumnValue(['Nome']).trim() : null;
          if (!nome) {
            skippedEmptyName++;
            if (skippedEmptyName <= 3) {
              console.log(`⚠️ Linha ${lineNumber}: Nome vazio, pulando...`);
            } else if (skippedEmptyName === 4) {
              console.log(`⚠️ ... e mais linhas com nome vazio`);
            }
            continue;
          }

          // MODIFICAÇÃO: Ser mais tolerante com duplicatas
          // Em vez de pular duplicatas, vamos verificar por CPF + Nome
          let duplicateCheck = null;

          const cpfValue = getColumnValue(['CPF']);
          if (cpfValue) {
            // Se tem CPF, verificar duplicata por CPF
            const cpfClean = cpfValue.replace(/\D/g, '');
            const { data: existingCPF } = await supabase
              .from('patients')
              .select('id')
              .eq('clinic_id', clinicId)
              .eq('cpf', cpfClean)
              .limit(1);
            duplicateCheck = existingCPF;
          }

          if (!duplicateCheck) {
            // Se não tem CPF ou não encontrou por CPF, verificar por nome + telefone
            const phone1 = getColumnValue(['Telefone']) ? getColumnValue(['Telefone']).replace(/\D/g, '') : '';
            const phone2 = getColumnValue(['Celular']) ? getColumnValue(['Celular']).replace(/\D/g, '') : '';
            const primaryPhone = phone2 || phone1; // Priorizar celular

            if (primaryPhone) {
              const { data: existingPhone } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('name', nome)
                .eq('phone', primaryPhone)
                .limit(1);
              duplicateCheck = existingPhone;
            }
          }

          if (duplicateCheck && duplicateCheck.length > 0) {
            skippedDuplicates++;
            if (skippedDuplicates <= 3) {
              console.log(`⚠️ Linha ${lineNumber}: Duplicata encontrada para ${nome}, pulando...`);
            } else if (skippedDuplicates === 4) {
              console.log(`⚠️ ... e mais duplicatas encontradas`);
            }
            continue;
          }

          // Preparar telefones (múltiplos números)
          const phones = [];

          // Telefone fixo
          const telefoneFixo = getColumnValue(['Telefone']);
          if (telefoneFixo) {
            const cleanPhone = telefoneFixo.replace(/\D/g, '');
            if (cleanPhone && cleanPhone.length >= 8) {
              phones.push({
                phone: cleanPhone,
                phone_type: 'home',
                is_primary: phones.length === 0,
                is_whatsapp: false
              });
            }
          }

          // Celular/WhatsApp
          const telefoneCelular = getColumnValue(['Celular']);
          if (telefoneCelular) {
            const cleanPhone = telefoneCelular.replace(/\D/g, '');
            if (cleanPhone && cleanPhone.length >= 8) {
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

          // DEBUG: Mostrar valores de endereço para as primeiras linhas
          if (lineNumber <= 5) {
            console.log(`🐛 DEBUG Linha ${lineNumber} - Endereço:`);
            console.log(`   Logradouro: "${getColumnValue(['Logradouro'])}"`);
            console.log(`   Número: "${getColumnValue(['Número'])}"`);
            console.log(`   Bairro: "${getColumnValue(['Bairro'])}"`);
            console.log(`   Cidade: "${getColumnValue(['Cidade'])}"`);
            console.log(`   Estado: "${getColumnValue(['Estado'])}"`);
            console.log(`   Cep: "${getColumnValue(['Cep'])}"`);
          }

          // Preparar dados completos do paciente
          const patientData = {
            clinic_id: clinicId,
            name: nome,
            cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null, // CPF apenas números
            email: getColumnValue(['Email']) || null,
            birthdate: getColumnValue(['Data de Nasc.']) ? moment(getColumnValue(['Data de Nasc.']), 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            gender: getColumnValue(['Gênero']) === 'Masculino' ? 'male' : getColumnValue(['Gênero']) === 'Feminino' ? 'female' : null,

            // Dados fiscais/endereço SEPARADOS (correção principal)
            document: formatDocument(cpfValue), // CPF formatado para notas
            zip_code: getColumnValue(['Cep']) ? getColumnValue(['Cep']).replace(/\D/g, '') : null,
            street: getColumnValue(['Logradouro']) || null,
            number: getColumnValue(['Número']) || null,
            complement: null, // Não temos complemento separado
            neighborhood: getColumnValue(['Bairro']) || null,
            city: getColumnValue(['Cidade']) || null,
            state: getColumnValue(['Estado']) || null,

            // Telefone principal (para compatibilidade)
            phone: phones.length > 0 ? phones[0].phone : null,

            // Endereço concatenado para compatibilidade
            address: [
              getColumnValue(['Logradouro']),
              getColumnValue(['Número']),
              getColumnValue(['Bairro']),
              getColumnValue(['Cidade']),
              getColumnValue(['Estado']),
              getColumnValue(['Cep'])
            ].filter(Boolean).join(', ') || null,

            // Notas com informações adicionais
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
              `Linha original: ${lineNumber}`
            ].filter(Boolean).join(' | ') || null
          };

          // Inserir paciente
          const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert([patientData])
            .select()
            .single();

          if (patientError) {
            console.error(`❌ Linha ${lineNumber} - Erro ao inserir ${nome}:`, patientError.message);
            skippedErrors++;
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
              console.warn(`⚠️ Linha ${lineNumber} - Erro ao inserir telefones para ${nome}:`, phonesError.message);
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
              email: getColumnValue(['Email']) || null,
              cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null,
              birth_date: patientData.birthdate,
              gender: patientData.gender,
              address_street: getColumnValue(['Logradouro']) || null,
              address_number: getColumnValue(['Número']) || null,
              address_neighborhood: getColumnValue(['Bairro']) || null,
              address_city: getColumnValue(['Cidade']) || null,
              address_state: getColumnValue(['Estado']) || null,
              address_zip: getColumnValue(['Cep']) ? getColumnValue(['Cep']).replace(/\D/g, '') : null,
              address_country: getColumnValue(['País']) || 'Brazil',
              alternate_phone: phones.length > 1 ? phones[1].phone : null,
              channel_type: 'whatsapp',
              notes: [
                getColumnValue(['Observação']) || '',
                getColumnValue(['Particularidade do Paciente']) || '',
                `Importado da linha ${lineNumber} em: ${new Date().toLocaleString('pt-BR')}`
              ].filter(Boolean).join(' | ') || null,
              created_at: new Date().toISOString()
            };

            // Verificar se contato já existe (por telefone)
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
                console.warn(`⚠️ Linha ${lineNumber} - Paciente criado mas erro no contato WhatsApp para ${nome}:`, contactError.message);
              }
            }
          }

          successCount++;
          if (successCount % 25 === 0) {
            console.log(`✅ ${successCount} pacientes importados... (linha ${lineNumber})`);
          }

        } catch (err) {
          console.error(`❌ Linha ${lineNumber} - Erro geral:`, err.message);
          skippedErrors++;
        }
      }

      console.log(`\n\n🏁 Importação finalizada!`);
      console.log(`📊 RESUMO:`);
      console.log(`   Total de linhas no CSV: ${results.length}`);
      console.log(`   ✅ Sucessos: ${successCount}`);
      console.log(`   ⚠️ Nomes vazios: ${skippedEmptyName}`);
      console.log(`   ⚠️ Duplicatas: ${skippedDuplicates}`);
      console.log(`   ❌ Erros: ${skippedErrors}`);
      console.log(`   📈 Taxa de sucesso: ${((successCount / results.length) * 100).toFixed(1)}%`);

      const processed = successCount + skippedEmptyName + skippedDuplicates + skippedErrors;
      console.log(`   📋 Total processado: ${processed}/${results.length}`);

      if (successCount > 0) {
        console.log(`\n🎉 Importação concluída com ${successCount} pacientes!`);
      }
    });
}

importPatientsImproved();
