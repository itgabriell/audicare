const fs = require('fs');

console.log('🔍 DEBUG RAW: Lendo CSV como texto puro para verificar endereços');

try {
  const csvContent = fs.readFileSync('PACIENTES1901.csv', 'utf8');
  const lines = csvContent.split('\n');

  console.log(`📄 Total de linhas no arquivo: ${lines.length}`);

  // Mostrar cabeçalho
  if (lines.length > 0) {
    console.log('\n📋 CABEÇALHO:');
    console.log(lines[0]);
  }

  // Procurar por linhas que contenham dados de endereço
  let linesWithAddressData = 0;
  const addressKeywords = ['Rua', 'Avenida', 'Alameda', 'Praça', 'Estrada', 'Travessa', 'Brasília', 'São Paulo', 'Rio', 'Belo Horizonte'];

  console.log('\n🔍 PROCURANDO POR DADOS DE ENDEREÇO:');

  for (let i = 1; i < Math.min(lines.length, 50); i++) { // Verificar primeiras 50 linhas de dados
    const line = lines[i];
    if (!line || line.trim() === '') continue;

    const hasAddressKeyword = addressKeywords.some(keyword =>
      line.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasAddressKeyword) {
      linesWithAddressData++;
      console.log(`✅ Linha ${i + 1} contém possível endereço:`);
      console.log(`   ${line.substring(0, 200)}...`);

      // Quebrar por ; para ver as colunas
      const columns = line.split(';');
      if (columns.length >= 18) { // Se tem pelo menos até Cep
        console.log(`   Coluna Logradouro (13): "${columns[12] || 'VAZIO'}"`);
        console.log(`   Coluna Número (14): "${columns[13] || 'VAZIO'}"`);
        console.log(`   Coluna Bairro (15): "${columns[14] || 'VAZIO'}"`);
        console.log(`   Coluna Cidade (16): "${columns[15] || 'VAZIO'}"`);
        console.log(`   Coluna Estado (17): "${columns[16] || 'VAZIO'}"`);
        console.log(`   Coluna CEP (18): "${columns[17] || 'VAZIO'}"`);
      }
    }
  }

  console.log(`\n📊 RESUMO DA ANÁLISE RAW:`);
  console.log(`   Linhas verificadas: ${Math.min(lines.length - 1, 50)}`);
  console.log(`   Linhas com possíveis endereços: ${linesWithAddressData}`);

  // Verificar uma linha específica que o usuário disse ter endereço
  if (lines.length > 10) {
    console.log('\n🎯 VERIFICANDO LINHA ESPECÍFICA (linha 10):');
    const testLine = lines[9]; // linha 10 (índice 9)
    console.log(testLine);

    const columns = testLine.split(';');
    console.log(`   Total de colunas nesta linha: ${columns.length}`);
    if (columns.length >= 18) {
      console.log(`   Logradouro: "${columns[12]}"`);
      console.log(`   Número: "${columns[13]}"`);
      console.log(`   Bairro: "${columns[14]}"`);
      console.log(`   Cidade: "${columns[15]}"`);
      console.log(`   Estado: "${columns[16]}"`);
      console.log(`   CEP: "${columns[17]}"`);
    }
  }

} catch (error) {
  console.error('❌ Erro ao ler arquivo:', error.message);
}
