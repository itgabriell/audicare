const fs = require('fs');
const csv = require('csv-parser');

console.log('🔍 DEBUG DETALHADO: Verificando endereços em todo o CSV...');

const results = [];
fs.createReadStream('PACIENTES1901.csv', { encoding: 'utf8' })
  .pipe(csv({ separator: ';' }))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`📂 Total de linhas lidas: ${results.length}`);

    let linesWithAddress = 0;
    let linesWithStreet = 0;
    let linesWithCity = 0;
    let sampleAddresses = [];

    // Verificar algumas linhas específicas (não só as primeiras)
    const linesToCheck = [0, 1, 2, 10, 50, 100, 200, 300, 400, 500, 600, results.length - 1];

    linesToCheck.forEach(lineIndex => {
      if (lineIndex < results.length) {
        const row = results[lineIndex];
        const nome = row['Nome'] ? row['Nome'].trim() : `LINHA ${lineIndex + 2}`;

        const logradouro = (row['Logradouro'] || '').trim();
        const numero = (row['Número'] || '').trim();
        const bairro = (row['Bairro'] || '').trim();
        const cidade = (row['Cidade'] || '').trim();
        const estado = (row['Estado'] || '').trim();
        const cep = (row['Cep'] || '').trim();

        const hasAnyAddress = logradouro || numero || bairro || cidade || estado || cep;

        if (hasAnyAddress) {
          linesWithAddress++;
          if (logradouro) linesWithStreet++;
          if (cidade) linesWithCity++;

          if (sampleAddresses.length < 5) {
            sampleAddresses.push({
              line: lineIndex + 2,
              nome,
              endereco: `${logradouro} ${numero} ${bairro} ${cidade} ${estado} ${cep}`.trim()
            });
          }
        }

        // Mostrar detalhes das primeiras 3 e últimas linhas
        if (lineIndex < 3 || lineIndex === results.length - 1) {
          console.log(`\n📋 Linha ${lineIndex + 2} - ${nome}:`);
          console.log(`   Raw Logradouro: "${row['Logradouro'] || 'NULL'}"`);
          console.log(`   Raw Número: "${row['Número'] || 'NULL'}"`);
          console.log(`   Raw Bairro: "${row['Bairro'] || 'NULL'}"`);
          console.log(`   Raw Cidade: "${row['Cidade'] || 'NULL'}"`);
          console.log(`   Raw Estado: "${row['Estado'] || 'NULL'}"`);
          console.log(`   Raw CEP: "${row['Cep'] || 'NULL'}"`);
        }
      }
    });

    console.log(`\n📊 ANÁLISE DETALHADA:`);
    console.log(`   Total de linhas no CSV: ${results.length}`);
    console.log(`   Linhas com algum campo de endereço: ${linesWithAddress}`);
    console.log(`   Linhas com logradouro: ${linesWithStreet}`);
    console.log(`   Linhas com cidade: ${linesWithCity}`);
    console.log(`   Taxa de endereços: ${((linesWithAddress / results.length) * 100).toFixed(2)}%`);

    if (sampleAddresses.length > 0) {
      console.log(`\n✅ LINHAS COM ENDEREÇO ENCONTRADAS:`);
      sampleAddresses.forEach(addr => {
        console.log(`   Linha ${addr.line}: ${addr.nome}`);
        console.log(`   Endereço: "${addr.endereco}"`);
      });
    } else {
      console.log(`\n❌ NENHUM endereço encontrado em nenhuma linha verificada!`);

      // Verificar se há dados em outras colunas que possam ter endereços
      console.log(`\n🔍 Verificando se há dados em outras colunas...`);
      const firstRow = results[0];
      const addressRelatedColumns = Object.keys(firstRow).filter(col =>
        col.toLowerCase().includes('endere') ||
        col.toLowerCase().includes('rua') ||
        col.toLowerCase().includes('avenida') ||
        col.toLowerCase().includes('bairro') ||
        col.toLowerCase().includes('cidade') ||
        col.toLowerCase().includes('cep')
      );

      if (addressRelatedColumns.length > 0) {
        console.log(`   Colunas relacionadas a endereço encontradas:`);
        addressRelatedColumns.forEach(col => {
          console.log(`   - ${col}: "${firstRow[col] || 'VAZIO'}"`);
        });
      } else {
        console.log(`   Nenhuma coluna relacionada a endereço encontrada além das já verificadas.`);
      }
    }

    // Verificar encoding tentando latin1
    console.log(`\n🔄 Testando com encoding latin1...`);
    const resultsLatin1 = [];
    fs.createReadStream('PACIENTES1901.csv', { encoding: 'latin1' })
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => resultsLatin1.push(data))
      .on('end', () => {
        if (resultsLatin1.length > 0) {
          const row = resultsLatin1[0];
          console.log(`   Com latin1 - Logradouro: "${row['Logradouro'] || 'NULL'}"`);
          console.log(`   Com latin1 - Cidade: "${row['Cidade'] || 'NULL'}"`);
        }
      });
  });
