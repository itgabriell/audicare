const dotenv = require('dotenv');
const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERRO: Verifique as variáveis de ambiente');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function atualizarEnderecos() {
  console.log('🏠 Iniciando atualização de endereços...');

  // 1. Pega ID da Clínica
  const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

  if (!clinic) {
    console.error('❌ Nenhuma clínica encontrada!');
    return;
  }
  const clinicId = clinic.id;
  console.log(`🏥 Clínica ID: ${clinicId}`);

  const results = [];
  const CSV_FILE = 'PACIENTES1901.csv';

  // Ler CSV
  fs.createReadStream(CSV_FILE, { encoding: 'utf8' })
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`📂 CSV lido: ${results.length} linhas encontradas.`);

      let addressesUpdated = 0;
      let patientsProcessed = 0;
      let errors = 0;

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const lineNumber = i + 2;

        try {
          // Mapeamento robusto para colunas (considerando encoding issues)
          const getColumnValue = (possibleNames) => {
            for (const name of possibleNames) {
              if (row[name] !== undefined && row[name] !== null && row[name].trim() !== '') {
                return row[name].trim();
              }
            }
            return null;
          };

          const nome = getColumnValue(['Nome']);
          if (!nome) {
            continue; // Pular linhas sem nome
          }

          // 1. LÓGICA DE FALLBACK PARA ENDEREÇOS
          // Tente coluna principal, depois .1 se existir
          const logradouro = getColumnValue(['Logradouro', 'Logradouro.1']);
          const numero = getColumnValue(['Número', 'Número.1']);
          const bairro = getColumnValue(['Bairro', 'Bairro.1']);
          const cidade = getColumnValue(['Cidade', 'Cidade.1']);
          const estado = getColumnValue(['Estado', 'Estado.1']);
          const cep = getColumnValue(['Cep', 'Cep.1']);

          // Só atualizar se pelo menos uma informação de endereço foi encontrada
          const hasAddressInfo = logradouro || numero || bairro || cidade || estado || cep;

          if (!hasAddressInfo) {
            patientsProcessed++;
            continue; // Não há endereço para atualizar
          }

          // 2. BUSCAR PACIENTE POR NOME (ou CPF se disponível)
          let patientQuery = supabase
            .from('patients')
            .select('id, name, street, city, zip_code')
            .eq('clinic_id', clinicId)
            .eq('name', nome);

          const cpfValue = getColumnValue(['CPF']);
          if (cpfValue) {
            const cpfClean = cpfValue.replace(/\D/g, '');
            if (cpfClean.length >= 11) {
              // Se tem CPF válido, buscar por CPF primeiro
              patientQuery = supabase
                .from('patients')
                .select('id, name, street, city, zip_code')
                .eq('clinic_id', clinicId)
                .eq('cpf', cpfClean);
            }
          }

          const { data: patients, error: findError } = await patientQuery.limit(1);

          if (findError) {
            console.error(`❌ Erro ao buscar paciente ${nome}:`, findError.message);
            errors++;
            continue;
          }

          if (!patients || patients.length === 0) {
            console.warn(`⚠️ Paciente não encontrado: ${nome}`);
            continue;
          }

          const patient = patients[0];

          // 3. PREPARAR DADOS DE ATUALIZAÇÃO (Mapeamento "Burro")
          const updateData = {};

          // Campos específicos (sempre salvar se existir)
          if (logradouro !== null) updateData.street = logradouro;
          if (numero !== null) updateData.number = numero;
          if (bairro !== null) updateData.neighborhood = bairro;
          if (cidade !== null) updateData.city = cidade;
          if (estado !== null) updateData.state = estado;
          if (cep !== null) updateData.zip_code = cep.replace(/\D/g, ''); // Limpar CEP

          // 4. CAMPO CORINGA (address) - Concatenação visual
          const addressParts = [];
          if (logradouro) addressParts.push(logradouro);
          if (numero) addressParts.push(numero);
          if (bairro) addressParts.push(bairro);
          if (cidade && estado) {
            addressParts.push(`${cidade}/${estado}`);
          } else if (cidade) {
            addressParts.push(cidade);
          } else if (estado) {
            addressParts.push(estado);
          }

          if (addressParts.length > 0) {
            updateData.address = addressParts.join(', ');
          }

          // Só atualizar se há dados para atualizar
          if (Object.keys(updateData).length === 0) {
            patientsProcessed++;
            continue;
          }

          // 5. EXECUTAR ATUALIZAÇÃO
          const { error: updateError } = await supabase
            .from('patients')
            .update(updateData)
            .eq('id', patient.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar endereço de ${nome}:`, updateError.message);
            errors++;
          } else {
            addressesUpdated++;
            if (addressesUpdated <= 5) {
              console.log(`✅ Endereço atualizado: ${nome} → ${updateData.address || 'Campos específicos'}`);
            } else if (addressesUpdated === 6) {
              console.log(`✅ ... e mais endereços atualizados`);
            }
          }

          patientsProcessed++;

          if (patientsProcessed % 100 === 0) {
            console.log(`📊 ${patientsProcessed} pacientes processados... (${addressesUpdated} endereços atualizados)`);
          }

        } catch (err) {
          console.error(`❌ Linha ${lineNumber} - Erro geral:`, err.message);
          errors++;
        }
      }

      // RELATÓRIO FINAL
      console.log(`\n\n🏁 ATUALIZAÇÃO DE ENDEREÇOS FINALIZADA!`);
      console.log(`📊 RESULTADOS:`);
      console.log(`   👥 Pacientes processados: ${patientsProcessed}`);
      console.log(`   🏠 Endereços atualizados: ${addressesUpdated}`);
      console.log(`   ❌ Erros: ${errors}`);
      console.log(`   📈 Taxa de sucesso: ${patientsProcessed > 0 ? ((addressesUpdated / patientsProcessed) * 100).toFixed(1) : 0}%`);

      // Verificar resultado final
      const { count: totalWithStreet } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .not('street', 'is', null);

      const { count: totalWithAddress } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .not('address', 'is', null);

      console.log(`\n📈 RESULTADO FINAL:`);
      console.log(`   🏠 Pacientes com 'street' preenchido: ${totalWithStreet}`);
      console.log(`   📍 Pacientes com 'address' preenchido: ${totalWithAddress}`);

      if (addressesUpdated > 0) {
        console.log(`\n🎉 ${addressesUpdated} pacientes agora têm endereço cadastrado!`);
      }
    });
}

atualizarEnderecos();
