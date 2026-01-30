const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addTagImportMiller() {
  console.log('🏷️ Adicionando tag "importmiller" aos pacientes importados...');

  // 1. Pega ID da Clínica
  const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

  if (!clinic) {
    console.error('❌ Nenhuma clínica encontrada!');
    return;
  }
  const clinicId = clinic.id;

  // 2. Buscar pacientes importados recentemente (usando múltiplas estratégias)
  console.log('🔍 Buscando pacientes importados...');

  // Estratégia 1: Pacientes com "Linha original:" nos notes
  const { data: strategy1, error: error1 } = await supabase
    .from('patients')
    .select('id, name, notes')
    .eq('clinic_id', clinicId)
    .like('notes', '%Linha original:%');

  // Estratégia 2: Pacientes criados hoje
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { data: strategy2, error: error2 } = await supabase
    .from('patients')
    .select('id, name, notes')
    .eq('clinic_id', clinicId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`);

  // Estratégia 3: Pacientes com endereços preenchidos (que foram atualizados)
  const { data: strategy3, error: error3 } = await supabase
    .from('patients')
    .select('id, name, notes')
    .eq('clinic_id', clinicId)
    .not('street', 'is', null);

  // Combinar resultados únicos
  const allIds = new Set();
  const importedPatients = [];

  // Adicionar da estratégia 1
  if (strategy1) {
    strategy1.forEach(p => {
      if (!allIds.has(p.id)) {
        allIds.add(p.id);
        importedPatients.push(p);
      }
    });
  }

  // Adicionar da estratégia 2 (se não estiver na 1)
  if (strategy2) {
    strategy2.forEach(p => {
      if (!allIds.has(p.id)) {
        allIds.add(p.id);
        importedPatients.push(p);
      }
    });
  }

  // Adicionar da estratégia 3 (se não estiver nas anteriores)
  if (strategy3) {
    strategy3.forEach(p => {
      if (!allIds.has(p.id)) {
        allIds.add(p.id);
        importedPatients.push(p);
      }
    });
  }

  console.log(`📊 Estratégias:`);
  console.log(`   Com "Linha original:": ${strategy1 ? strategy1.length : 0}`);
  console.log(`   Criados hoje: ${strategy2 ? strategy2.length : 0}`);
  console.log(`   Com endereço: ${strategy3 ? strategy3.length : 0}`);
  console.log(`   Total único: ${importedPatients.length}`);

  if (!importedPatients || importedPatients.length === 0) {
    console.log('⚠️ Nenhum paciente importado encontrado para marcar com tag.');
    return;
  }

  console.log(`📋 Encontrados ${importedPatients.length} pacientes importados para marcar com tag.`);

  let taggedCount = 0;
  const TAG = '[TAG: importmiller]';

  for (const patient of importedPatients) {
    // Verificar se já tem a tag
    const alreadyHasTag = patient.notes && patient.notes.includes(TAG);

    if (alreadyHasTag) {
      console.log(`⚠️ ${patient.name} já tem a tag`);
      continue;
    }

    // Adicionar tag no início do campo notes
    const newNotes = patient.notes
      ? `${TAG} ${patient.notes}`
      : TAG;

    // Atualizar paciente
    const { error: updateError } = await supabase
      .from('patients')
      .update({ notes: newNotes })
      .eq('id', patient.id);

    if (updateError) {
      console.error(`❌ Erro ao marcar ${patient.name}:`, updateError.message);
    } else {
      taggedCount++;
      if (taggedCount <= 5) {
        console.log(`✅ ${taggedCount}. ${patient.name} marcado com tag`);
      } else if (taggedCount === 6) {
        console.log(`✅ ... e mais pacientes sendo marcados`);
      }
    }
  }

  // Verificação final
  const { count: totalTagged } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .like('notes', `%${TAG}%`);

  console.log(`\n🏁 MARCAÇÃO CONCLUÍDA!`);
  console.log(`📊 RESULTADOS:`);
  console.log(`   👥 Pacientes marcados: ${taggedCount}`);
  console.log(`   🏷️ Total com tag "importmiller": ${totalTagged}`);

  if (taggedCount > 0) {
    console.log(`\n🎉 ${taggedCount} pacientes marcados com tag "importmiller"!`);
    console.log(`💡 Agora você pode filtrar pacientes importados do sistema Miller.`);
  }
}

addTagImportMiller();
