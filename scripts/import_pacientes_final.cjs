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

async function importPatientsFinal() {
  console.log('🚀 Iniciando importação FINAL de pacientes...');

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
      let skippedNoPhone = 0;
      let contactCreatedCount = 0;

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

          // CORREÇÃO: Lógica melhorada de duplicatas por CPF primeiro
          let duplicateCheck = null;
          const cpfValue = getColumnValue(['CPF']);

          if (cpfValue) {
            const cpfClean = cpfValue.replace(/\D/g, '');
            if (cpfClean.length >= 11) { // CPF válido
              const { data: existingCPF } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('cpf', cpfClean)
                .limit(1);
              duplicateCheck = existingCPF;
            }
          }

          if (duplicateCheck && duplicateCheck.length > 0) {
            skippedDuplicates++;
            if (skippedDuplicates <= 5) {
              console.log(`⚠️ Linha ${lineNumber}: CPF duplicado para ${nome}, pulando...`);
            } else if (skippedDuplicates === 6) {
              console.log(`⚠️ ... e mais CPF duplicados`);
            }
            continue;
          }

          // CORREÇÃO CRÍTICA: Lógica de telefone aprimorada
          // Priorizar celular, depois telefone fixo
          let primaryPhone = null;
          let phoneType = null;

          const celularValue = getColumnValue(['Celular']);
          const telefoneValue = getColumnValue(['Telefone']);

          // Limpar caracteres não numéricos
          const cleanCelular = celularValue ? celularValue.replace(/\D/g, '') : '';
          const cleanTelefone = telefoneValue ? telefoneValue.replace(/\D/g, '') : '';

          // Lógica: Celular primeiro, depois telefone
          if (cleanCelular && cleanCelular.length >= 8) {
            primaryPhone = cleanCelular;
            phoneType = 'mobile';
          } else if (cleanTelefone && cleanTelefone.length >= 8) {
            primaryPhone = cleanTelefone;
            phoneType = 'home';
          }

          // Preparar telefones múltiplos
          const phones = [];

          // Adicionar telefone fixo se existir e for diferente do celular
          if (cleanTelefone && cleanTelefone.length >= 8 && cleanTelefone !== cleanCelular) {
            phones.push({
              phone: cleanTelefone,
              phone_type: 'home',
              is_primary: phoneType === 'home',
              is_whatsapp: false
            });
          }

          // Adicionar celular se existir
          if (cleanCelular && cleanCelular.length >= 8) {
            phones.push({
              phone: cleanCelular,
              phone_type: 'mobile',
              is_primary: phoneType === 'mobile',
              is_whatsapp: true
            });
          }

          // CORREÇÃO CRÍTICA: Mapeamento explícito de endereços
          const logradouro = getColumnValue(['Logradouro']);
          const numero = getColumnValue(['Número']);
          const bairro = getColumnValue(['Bairro']);
          const cidade = getColumnValue(['Cidade']);
          const estado = getColumnValue(['Estado']);
          const cep = getColumnValue(['Cep']);

          // Função para formatar CPF/CNPJ
          const formatDocument = (cpf) => {
            if (!cpf) return null;
            const cleaned = cpf.replace(/\D/g, '');
            if (cleaned.length === 11) {
              return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else if (cleaned.length === 14) {
              return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            }
            return cleaned;
          };

          // Preparar dados completos do paciente
          const patientData = {
            clinic_id: clinicId,
            name: nome,
            cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null,
            email: getColumnValue(['Email']) || null,
            birthdate: getColumnValue(['Data de Nasc.']) ? moment(getColumnValue(['Data de Nasc.']), 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            gender: getColumnValue(['Gênero']) === 'Masculino' ? 'male' : getColumnValue(['Gênero']) === 'Feminino' ? 'female' : null,

            // CORREÇÃO: Mapeamento explícito de endereços
            document: formatDocument(cpfValue),
            zip_code: cep ? cep.replace(/\D/g, '') : null,
            street: logradouro || null,
            number: numero || null,
            complement: null,
            neighborhood: bairro || null,
            city: cidade || null,
            state: estado || null,

            // Telefone principal (para compatibilidade)
            phone: primaryPhone,

            // Endereço concatenado para compatibilidade
            address: [logradouro, numero, bairro, cidade, estado, cep].filter(Boolean).join(', ') || null,

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
              console.warn(`⚠️ Linha ${lineNumber} - Erro ao inserir telefones para ${nome}:`, phonesError.message);
            }
          }

          // CORREÇÃO CRÍTICA: Só criar contato se tiver telefone válido
          let contactCreated = false;
          if (primaryPhone && primaryPhone.length >= 8) {
            // Verificar se contato já existe (por telefone)
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('clinic_id', clinicId)
              .eq('phone', primaryPhone)
              .limit(1);

            if (!existingContact || existingContact.length === 0) {
              const contactData = {
                clinic_id: clinicId,
                patient_id: patient.id,
                name: nome,
                phone: primaryPhone,
                email: getColumnValue(['Email']) || null,
                cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null,
                birth_date: patientData.birthdate,
                gender: patientData.gender,
                // CORREÇÃO: Mapeamento explícito de endereços em contacts
                address_street: logradouro || null,
                address_number: numero || null,
                address_neighborhood: bairro || null,
                address_city: cidade || null,
                address_state: estado || null,
                address_zip: cep ? cep.replace(/\D/g, '') : null,
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

              const { error: contactError } = await supabase
                .from('contacts')
                .insert([contactData]);

              if (contactError) {
                console.warn(`⚠️ Linha ${lineNumber} - Paciente criado mas erro no contato para ${nome}:`, contactError.message);
              } else {
                contactCreated = true;
                contactCreatedCount++;
              }
            } else {
              contactCreated = true; // Já existia
            }
          } else {
            skippedNoPhone++;
            if (skippedNoPhone <= 3) {
              console.log(`📞 Linha ${lineNumber}: ${nome} sem telefone válido - pulando contato`);
            } else if (skippedNoPhone === 4) {
              console.log(`📞 ... e mais pacientes sem telefone`);
            }
          }

          successCount++;
          if (successCount % 50 === 0) {
            console.log(`✅ ${successCount} pacientes importados... (linha ${lineNumber})`);
          }

        } catch (err) {
          console.error(`❌ Linha ${lineNumber} - Erro geral:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n\n🏁 Importação finalizada!`);
      console.log(`📊 RESUMO:`);
      console.log(`   Total de linhas no CSV: ${results.length}`);
      console.log(`   ✅ Pacientes criados: ${successCount}`);
      console.log(`   📞 Contatos criados: ${contactCreatedCount}`);
      console.log(`   ⚠️ Nomes vazios: ${skippedEmptyName}`);
      console.log(`   ⚠️ CPF duplicados: ${skippedDuplicates}`);
      console.log(`   📞 Sem telefone: ${skippedNoPhone}`);
      console.log(`   ❌ Erros: ${errorCount}`);
      console.log(`   📈 Taxa de sucesso: ${((successCount / results.length) * 100).toFixed(1)}%`);

      const processed = successCount + skippedEmptyName + skippedDuplicates + skippedNoPhone + errorCount;
      console.log(`   📋 Total processado: ${processed}/${results.length}`);

      if (successCount > 0) {
        console.log(`\n🎉 Importação concluída com ${successCount} pacientes!`);
        console.log(`   Endereços mapeados: Logradouro→street, Número→number, Bairro→neighborhood, Cidade→city, Estado→state, Cep→zip_code`);
      }
    });
}

importPatientsFinal();
