const fs = require('fs');
const csv = require('csv-parser');

console.log('🔍 Verificando colunas do CSV...');

const results = [];
fs.createReadStream('PACIENTES1901.csv', { encoding: 'utf8' })
  .pipe(csv({ separator: ';' }))
  .on('data', (data) => results.push(data))
  .on('end', () => {
    if (results.length > 0) {
      const firstRow = results[0];
      console.log('📋 Colunas encontradas no CSV:');
      Object.keys(firstRow).forEach((col, index) => {
        console.log(`${index + 1}. ${col}`);
      });

      console.log(`\n📊 Total de colunas: ${Object.keys(firstRow).length}`);

      // Procurar por colunas de endereço
      const addressColumns = Object.keys(firstRow).filter(col =>
        col.includes('Logradouro') ||
        col.includes('Número') ||
        col.includes('Bairro') ||
        col.includes('Cidade') ||
        col.includes('Estado') ||
        col.includes('Cep')
      );

      console.log('\n🏠 Colunas de endereço encontradas:');
      addressColumns.forEach(col => {
        console.log(`- ${col}`);
      });
    }
  });
