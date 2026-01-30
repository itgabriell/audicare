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

async function verifyImport() {
  console.log('🔍 Verificando importação de pacientes...');

  try {
    // 1. Pega ID da Clínica
    const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();

    if (!clinic) {
      console.error('❌ Nenhuma clínica encontrada!');
      return;
    }
    const clinicId = clinic.id;
    console.log(`🏥 Clínica ID: ${clinicId}`);

    // 2. Contar pacientes
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    console.log(`📊 Total de pacientes: ${totalPatients}`);

    if (totalPatients === 0) {
      console.log('⚠️ Nenhum paciente encontrado. A importação pode não ter sido executada.');
      return;
    }

    // 3. Verificar estrutura dos dados
    const { data: samplePatients } = await supabase
      .from('patients')
      .select(`
        id, name, cpf, email, birthdate, gender, document,
        zip_code, street, number, neighborhood, city, state,
        phone, notes, created_at
      `)
      .eq('clinic_id', clinicId)
      .limit(5);

    console.log('\n📋 Exemplos de pacientes importados:');
    samplePatients.forEach((patient, index) => {
      console.log(`\n${index + 1}. ${patient.name}`);
      console.log(`   CPF: ${patient.cpf || 'N/A'}`);
      console.log(`   Email: ${patient.email || 'N/A'}`);
      console.log(`   Data Nasc.: ${patient.birthdate || 'N/A'}`);
      console.log(`   Gênero: ${patient.gender || 'N/A'}`);
      console.log(`   Documento: ${patient.document || 'N/A'}`);
      console.log(`   Endereço: ${patient.street ? `${patient.street}, ${patient.number || 'S/N'} - ${patient.neighborhood || ''}, ${patient.city || ''}/${patient.state || ''}` : 'N/A'}`);
      console.log(`   CEP: ${patient.zip_code || 'N/A'}`);
      console.log(`   Telefone: ${patient.phone || 'N/A'}`);
      console.log(`   Criado em: ${new Date(patient.created_at).toLocaleString('pt-BR')}`);
    });

    // 4. Verificar telefones múltiplos
    console.log('\n📞 Verificando telefones múltiplos...');
    const { data: patientPhones } = await supabase
      .from('patient_phones')
      .select(`
        patient_id,
        phone,
        phone_type,
        is_primary,
        is_whatsapp
      `)
      .in('patient_id', samplePatients.map(p => p.id))
      .order('patient_id', { ascending: true })
      .order('is_primary', { ascending: false });

    if (patientPhones && patientPhones.length > 0) {
      console.log(`Telefones encontrados: ${patientPhones.length}`);
      patientPhones.forEach(phone => {
        console.log(`  Paciente ${phone.patient_id}: ${phone.phone} (${phone.phone_type}) ${phone.is_primary ? '- Principal' : ''} ${phone.is_whatsapp ? '- WhatsApp' : ''}`);
      });
    } else {
      console.log('Nenhum telefone múltiplo encontrado.');
    }

    // 5. Verificar contatos WhatsApp criados
    console.log('\n📱 Verificando contatos WhatsApp...');
    const { count: whatsappContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .not('patient_id', 'is', null);

    console.log(`Contatos WhatsApp vinculados: ${whatsappContacts}`);

    // 6. Verificar duplicatas
    console.log('\n🔍 Verificando possíveis duplicatas...');
    const { data: duplicates } = await supabase
      .rpc('check_patient_duplicates', { clinic_id_param: clinicId });

    if (duplicates && duplicates.length > 0) {
      console.log(`⚠️ Possíveis duplicatas encontradas: ${duplicates.length}`);
      duplicates.slice(0, 3).forEach(dup => {
        console.log(`  ${dup.name} - ${dup.phone}`);
      });
    } else {
      console.log('✅ Nenhuma duplicata óbvia encontrada.');
    }

    // 7. Estatísticas gerais
    console.log('\n📈 Estatísticas da importação:');

    // Pacientes com CPF
    const { count: withCPF } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .not('cpf', 'is', null);

    // Pacientes com email
    const { count: withEmail } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .not('email', 'is', null);

    // Pacientes com endereço completo
    const { count: withAddress } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .not('street', 'is', null);

    // Pacientes com telefone
    const { count: withPhone } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .not('phone', 'is', null);

    console.log(`   Com CPF: ${withCPF} (${((withCPF/totalPatients)*100).toFixed(1)}%)`);
    console.log(`   Com Email: ${withEmail} (${((withEmail/totalPatients)*100).toFixed(1)}%)`);
    console.log(`   Com Endereço: ${withAddress} (${((withAddress/totalPatients)*100).toFixed(1)}%)`);
    console.log(`   Com Telefone: ${withPhone} (${((withPhone/totalPatients)*100).toFixed(1)}%)`);

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

verifyImport();
