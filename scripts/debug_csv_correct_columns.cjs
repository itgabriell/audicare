const fs = require('fs');
const csv = require('csv-parser');

console.log('🎯 DEBUG CORRETO: Verificando colunas de endereço SEM sufixo .1');

const results = [];
fs.createReadStream('PACIENTES1901.csv', { encoding: 'utf8' })
  .pipe(csv({ separator: ';' }))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`📂 Total de linhas lidas: ${results.length}`);

    if (results.length === 0) {
      console.log('❌ Nenhuma linha lida!');
      return;
    }

    // Mostrar todas as colunas disponíveis
    const allColumns = Object.keys(results[0]);
    console.log('\n📋 TODAS AS COLUNAS DISPONÍVEIS:');
    allColumns.forEach((col, index) => {
      console.log(`${index + 1}. "${col}"`);
    });

    // Procurar especificamente pelas colunas de endereço mencionadas pelo usuário
    const targetColumns = ['Logradouro', 'Número', 'Bairro', 'Cidade', 'Estado', 'Cep'];
    console.log('\n🎯 VERIFICANDO COLUNAS ESPECÍFICAS:');

    targetColumns.forEach(colName => {
      const exists = allColumns.includes(colName);
      console.log(`   ${colName}: ${exists ? '✅ Existe' : '❌ Não existe'}`);

      if (exists) {
        // Verificar se há dados nesta coluna
        let filledCount = 0;
        let samples = [];

        results.forEach((row, index) => {
          const value = row[colName];
          if (value && value.trim() !== '') {
            filledCount++;
            if (samples.length < 3) {
              const nome = row['Nome'] || `Linha ${index + 2}`;
              samples.push(`${nome}: "${value.trim()}"`);
            }
          }
        });

        console.log(`      📊 Preenchidas: ${filledCount}/${results.length} (${((filledCount/results.length)*100).toFixed(1)}%)`);

        if (samples.length > 0) {
          console.log('      💡 Exemplos:');
          samples.forEach(sample => console.log(`         ${sample}`));
        }
      }
    });

    // Verificar se as colunas .1 existem e estão vazias
    console.log('\n🔍 VERIFICANDO COLUNAS COM SUFIXO .1:');
    const dotOneColumns = allColumns.filter(col => col.endsWith('.1'));
    console.log(`   Colunas .1 encontradas: ${dotOneColumns.length}`);

    if (dotOneColumns.length > 0) {
      dotOneColumns.forEach(col => {
        const filledCount = results.filter(row => row[col] && row[col].trim() !== '').length;
        console.log(`   ${col}: ${filledCount} preenchidas`);
      });
    }

    // Mostrar uma linha completa de exemplo
    console.log('\n📋 LINHA DE EXEMPLO COMPLETA (Linha 2):');
    const exampleRow = results[1]; // Linha 2 (índice 1)
    const nome = exampleRow['Nome'] || 'SEM NOME';

    console.log(`Paciente: ${nome}`);
    targetColumns.forEach(col => {
      const value = exampleRow[col];
      console.log(`   ${col}: "${value || 'VAZIO'}"`);
    });

    // Verificar se há algum padrão de encoding
    console.log('\n🔄 TESTANDO ENCODING LATIN1:');
    const resultsLatin1 = [];
    fs.createReadStream('PACIENTES1901.csv', { encoding: 'latin1' })
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => resultsLatin1.push(data))
      .on('end', () => {
        if (resultsLatin1.length > 0) {
          const row = resultsLatin1[1]; // Mesma linha
          console.log(`Com latin1 - Paciente: ${row['Nome'] || 'SEM NOME'}`);
          targetColumns.forEach(col => {
            const value = row[col];
            console.log(`   ${col}: "${value || 'VAZIO'}"`);
          });
        }
      });
  });
