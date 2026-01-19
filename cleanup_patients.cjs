const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcXZteWJmbHV4Z3JkaGppdWpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MzI5NSwiZXhwIjoyMDc4NDQ5Mjk1fQ.1zDg-HrjfKl74-gvoNi_7UNCcBSxXI1RhEEpapnGeCo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERRO: Verifique as variáveis de ambiente');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanupIncorrectPatients() {
  console.log('🧹 Iniciando limpeza de dados incorretos de pacientes...');

  try {
    // 1. Pega ID da Clínica
    const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

    if (!clinic) {
      console.error('❌ Nenhuma clínica encontrada!');
      return;
    }
    const clinicId = clinic.id;
    console.log(`🏥 Clínica ID: ${clinicId}`);

    // 2. Verificar quantos pacientes existem
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    console.log(`📊 Total de pacientes na clínica: ${totalPatients}`);

    if (totalPatients === 0) {
      console.log('✅ Nenhum paciente encontrado para limpar.');
      return;
    }

    // 3. Mostrar alguns exemplos dos dados atuais
    const { data: samplePatients } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(3);

    console.log('📋 Exemplos de dados atuais:');
    samplePatients.forEach((patient, index) => {
      console.log(`${index + 1}. Nome: ${patient.name}, Phone: ${patient.phone}, Notes: ${patient.notes ? patient.notes.substring(0, 50) + '...' : 'N/A'}`);
    });

    // 4. Apagar contatos relacionados primeiro (por causa da foreign key)
    console.log('🗑️ Apagando contatos relacionados...');

    const { error: deleteContactsError } = await supabase
      .from('contacts')
      .delete()
      .eq('clinic_id', clinicId)
      .not('patient_id', 'is', null);

    if (deleteContactsError) {
      console.error('❌ Erro ao apagar contatos relacionados:', deleteContactsError);
      return;
    }

    console.log('✅ Contatos relacionados removidos.');

    // 5. Agora apagar os pacientes
    console.log('🗑️ Apagando pacientes...');

    const { error: deleteError } = await supabase
      .from('patients')
      .delete()
      .eq('clinic_id', clinicId);

    if (deleteError) {
      console.error('❌ Erro ao apagar pacientes:', deleteError);
      return;
    }

    // 5. Verificar se foram apagados
    const { count: remainingPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    console.log(`✅ Pacientes restantes: ${remainingPatients}`);

    console.log('\n🎉 Limpeza concluída! Base pronta para nova importação.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

cleanupIncorrectPatients();
