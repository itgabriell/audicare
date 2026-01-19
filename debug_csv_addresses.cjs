const fs = require('fs');
const csv = require('csv-parser');

console.log('🐛 DEBUG: Verificando se há dados de endereço no CSV...');

const results = [];
fs.createReadStream('PACIENTES1901.csv', { encoding: 'utf8' })
  .pipe(csv({ separator: ';' }))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`📂 Total de linhas lidas: ${results.length}`);

    let linesWithAddress = 0;
    let sampleLines = [];

    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const row = results[i];
      const nome = row['Nome'] ? row['Nome'].trim() : 'SEM NOME';

      const logradouro = row['Logradouro'] || '';
      const numero = row['Número'] || '';
      const bairro = row['Bairro'] || '';
      const cidade = row['Cidade'] || '';
      const estado = row['Estado'] || '';
      const cep = row['Cep'] || '';

      const hasAddress = logradouro.trim() || numero.trim() || bairro.trim() ||
                        cidade.trim() || estado.trim() || cep.trim();

      if (hasAddress) {
        linesWithAddress++;
        sampleLines.push({
          nome,
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.trim(),
          cep: cep.trim()
        });
      }

      if (i < 3) { // Mostrar primeiras 3 linhas sempre
        console.log(`\n📋 Linha ${i + 2} - ${nome}:`);
        console.log(`   Logradouro: "${logradouro}"`);
        console.log(`   Número: "${numero}"`);
        console.log(`   Bairro: "${bairro}"`);
        console.log(`   Cidade: "${cidade}"`);
        console.log(`   Estado: "${estado}"`);
        console.log(`   CEP: "${cep}"`);
        console.log(`   → Tem endereço? ${hasAddress ? 'SIM' : 'NÃO'}`);
      }
    }

    console.log(`\n📊 RESUMO:`);
    console.log(`   Linhas com algum endereço: ${linesWithAddress}/${results.length}`);
    console.log(`   Taxa: ${((linesWithAddress / results.length) * 100).toFixed(1)}%`);

    if (sampleLines.length > 0) {
      console.log(`\n✅ EXEMPLOS de linhas com endereço:`);
      sampleLines.slice(0, 3).forEach((line, idx) => {
        console.log(`   ${idx + 1}. ${line.nome}: ${line.logradouro}, ${line.numero} - ${line.bairro}, ${line.cidade}/${line.estado} CEP: ${line.cep}`);
      });
    } else {
      console.log(`\n❌ NENHUMA linha tem dados de endereço preenchidos!`);
    }
  });
