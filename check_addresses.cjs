const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAddresses() {
  console.log('🔍 Verificando endereços dos pacientes...');

  // Pacientes com endereço preenchido
  const { data: patientsWithAddress } = await supabase
    .from('patients')
    .select('name, street, number, neighborhood, city, state, zip_code, address')
    .not('street', 'is', null)
    .limit(10);

  console.log(`📍 Pacientes com endereço (street preenchido): ${patientsWithAddress.length}`);

  if (patientsWithAddress && patientsWithAddress.length > 0) {
    patientsWithAddress.forEach((p, i) => {
      console.log(`${i+1}. ${p.name}`);
      console.log(`   Street: ${p.street || 'N/A'}`);
      console.log(`   Number: ${p.number || 'N/A'}`);
      console.log(`   Neighborhood: ${p.neighborhood || 'N/A'}`);
      console.log(`   City: ${p.city || 'N/A'}`);
      console.log(`   State: ${p.state || 'N/A'}`);
      console.log(`   ZIP: ${p.zip_code || 'N/A'}`);
      console.log(`   Address: ${p.address || 'N/A'}`);
      console.log('');
    });
  }

  // Verificar se há algum paciente com qualquer campo de endereço preenchido
  const { count: totalWithAnyAddress } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .or('street.not.is.null,city.not.is.null,zip_code.not.is.null');

  console.log(`📊 Total de pacientes com algum campo de endereço: ${totalWithAnyAddress}`);

  // Mostrar alguns exemplos de pacientes que NÃO têm endereço
  const { data: patientsWithoutAddress } = await supabase
    .from('patients')
    .select('name, street, city, zip_code')
    .is('street', null)
    .limit(5);

  console.log(`❌ Exemplos de pacientes SEM endereço:`);
  patientsWithoutAddress.forEach((p, i) => {
    console.log(`${i+1}. ${p.name} - Street: ${p.street || 'N/A'}, City: ${p.city || 'N/A'}, ZIP: ${p.zip_code || 'N/A'}`);
  });
}

checkAddresses();
