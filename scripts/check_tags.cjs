const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTags() {
  console.log('🏷️ Verificando pacientes com tag "importmiller"...');

  // 1. Pega ID da Clínica
  const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

  if (!clinic) {
    console.error('❌ Nenhuma clínica encontrada!');
    return;
  }
  const clinicId = clinic.id;

  // Buscar pacientes com tag
  const { data: taggedPatients, count, error } = await supabase
    .from('patients')
    .select('name, notes', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .like('notes', '%[TAG: importmiller]%')
    .limit(5);

  if (error) {
    console.error('❌ Erro na consulta:', error.message);
    return;
  }

  console.log(`📊 Pacientes com tag "importmiller": ${count}`);

  if (taggedPatients && taggedPatients.length > 0) {
    console.log('\n💡 Exemplos de pacientes marcados:');
    taggedPatients.forEach((p, i) => {
      console.log(`${i+1}. ${p.name}`);
      if (p.notes) {
        const tagIndex = p.notes.indexOf('[TAG: importmiller]');
        const preview = p.notes.substring(tagIndex, tagIndex + 80) + '...';
        console.log(`   Tag: ${preview}`);
      }
    });
  }

  console.log('\n✅ Verificação concluída!');
}

checkTags();
