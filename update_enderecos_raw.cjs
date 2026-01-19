const dotenv = require('dotenv');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function atualizarEnderecosRaw() {
  console.log('🏠 ATUALIZAÇÃO DE ENDEREÇOS - LEITURA RAW');

  try {
    // Ler o CSV como texto puro
    const csvContent = fs.readFileSync('PACIENTES1901.csv', 'utf8');
    const lines = csvContent.split('\n');

    console.log(`📂 Lendo ${lines.length} linhas do CSV`);

    let addressesUpdated = 0;
    let linesProcessed = 0;

    // Pular cabeçalho (linha 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(';');
      if (columns.length < 18) continue; // Linha muito curta

      // Extrair dados básicos
      const nome = columns[2]?.trim(); // Coluna Nome
      const cpf = columns[3]?.replace(/\D/g, ''); // Coluna CPF

      if (!nome) continue;

      // Extrair endereço (colunas corretas baseadas na análise raw)
      const logradouro = columns[12]?.trim(); // Logradouro
      const numero = columns[13]?.trim(); // Número
      const bairro = columns[14]?.trim(); // Bairro
      const cidade = columns[15]?.trim(); // Cidade
      const estado = columns[16]?.trim(); // Estado
      const cep = columns[17]?.replace(/\D/g, ''); // CEP

      // Verificar se há dados de endereço
      const hasAddressData = (logradouro || numero || bairro || cidade || estado || cep);

      if (!hasAddressData) {
        linesProcessed++;
        continue; // Não há endereço para atualizar
      }

      // Buscar paciente por CPF primeiro, depois por nome
      let patient = null;

      if (cpf && cpf.length >= 11) {
        const { data } = await supabase
          .from('patients')
          .select('id, name')
          .eq('cpf', cpf)
          .limit(1);

        if (data && data.length > 0) {
          patient = data[0];
        }
      }

      // Se não encontrou por CPF, buscar por nome
      if (!patient) {
        const { data } = await supabase
          .from('patients')
          .select('id, name')
          .eq('name', nome)
          .limit(1);

        if (data && data.length > 0) {
          patient = data[0];
        }
      }

      if (!patient) {
        //console.log(`⚠️ Paciente não encontrado: ${nome}`);
        linesProcessed++;
        continue;
      }

      // Preparar dados de atualização
      const updateData = {};

      if (logradouro && logradouro !== '') updateData.street = logradouro;
      if (numero && numero !== '') updateData.number = numero;
      if (bairro && bairro !== '') updateData.neighborhood = bairro;
      if (cidade && cidade !== '') updateData.city = cidade;
      if (estado && estado !== '') updateData.state = estado;
      if (cep && cep !== '') updateData.zip_code = cep;

      // Criar campo address concatenado
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

      // Executar atualização
      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patient.id);

      if (error) {
        console.error(`❌ Erro ao atualizar ${nome}:`, error.message);
      } else {
        addressesUpdated++;
        if (addressesUpdated <= 10) {
          console.log(`✅ ${addressesUpdated}. ${nome} → ${updateData.address || 'Campos específicos'}`);
        } else if (addressesUpdated === 11) {
          console.log(`✅ ... e mais endereços sendo atualizados`);
        }
      }

      linesProcessed++;

      if (linesProcessed % 100 === 0) {
        console.log(`📊 ${linesProcessed} linhas processadas... (${addressesUpdated} endereços atualizados)`);
      }
    }

    // Resultado final
    console.log(`\n🏁 ATUALIZAÇÃO CONCLUÍDA!`);
    console.log(`📊 RESULTADOS:`);
    console.log(`   📄 Linhas processadas: ${linesProcessed}`);
    console.log(`   🏠 Endereços atualizados: ${addressesUpdated}`);
    console.log(`   📈 Taxa de sucesso: ${linesProcessed > 0 ? ((addressesUpdated / linesProcessed) * 100).toFixed(1) : 0}%`);

    // Verificar estatísticas finais
    const { count: totalWithStreet } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .not('street', 'is', null);

    const { count: totalWithAddress } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .not('address', 'is', null);

    console.log(`\n📈 RESULTADO FINAL NO BANCO:`);
    console.log(`   🏠 Pacientes com 'street': ${totalWithStreet}`);
    console.log(`   📍 Pacientes com 'address': ${totalWithAddress}`);

    if (addressesUpdated > 0) {
      console.log(`\n🎉 ${addressesUpdated} pacientes agora têm endereço cadastrado!`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

atualizarEnderecosRaw();
