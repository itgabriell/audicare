import { supabase } from '@/lib/customSupabaseClient';

const patientsData = [
  { name: "Carlos Silva", cpf: "111.222.333-44", email: "carlos.silva@example.com", phone: "+5511987654321", birthdate: "1980-05-15", address: "Rua das Flores, 123", notes: "Paciente novo, primeira consulta.", medical_history: "Hipertensão" },
  { name: "Maria Oliveira", cpf: "222.333.444-55", email: "maria.oliveira@example.com", phone: "+5521912345678", birthdate: "1975-09-20", address: "Avenida Principal, 456", notes: "Retorno para ajuste de aparelho.", medical_history: "Diabetes tipo 2" },
  { name: "João Pereira", email: "joao.pereira@example.com", phone: "+5531998761234", birthdate: "1992-02-10", address: "Praça da Matriz, 789", medical_history: "Asma" },
  { name: "Ana Costa", phone: "+5541987659876", birthdate: "1988-11-30", address: "Alameda dos Anjos, 101", notes: "Acompanhamento anual." },
];

const messagesData = [
    { contact_phone: "+5511987654321", content: "Olá, gostaria de marcar uma consulta.", sender_type: "contact" },
    { contact_phone: "+5511987654321", content: "Claro, Carlos! Para quando você gostaria?", sender_type: "user" },
    { contact_phone: "+5521912345678", content: "Bom dia, preciso remarcar meu retorno.", sender_type: "contact" },
];

async function findOrCreate(table, match, defaults) {
    const { data, error } = await supabase.from(table).select('id').match(match).limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) return { id: data.id, created: false };
    
    const { data: newData, error: insertError } = await supabase.from(table).insert(defaults).select('id').single();
    if (insertError) throw insertError;

    return { id: newData.id, created: true };
}

export async function seedDatabase() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Usuário não autenticado.");

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('clinic_id').eq('id', user.id).single();
    if (profileError || !profile?.clinic_id) throw new Error("ID da clínica não encontrado para o usuário.");

    const clinicId = profile.clinic_id;
    console.log(`Iniciando o seeding para a clínica: ${clinicId}`);

    for (const patient of patientsData) {
        // 1. Create Patient if not exists
        const { id: patientId } = await findOrCreate(
            'patients',
            { clinic_id: clinicId, cpf: patient.cpf },
            { ...patient, clinic_id: clinicId }
        );
        console.log(`Patient ${patient.name} (${patientId}) processed.`);

        if (!patient.phone) continue;

        // 2. Create Contact if not exists
        const { id: contactId } = await findOrCreate(
            'contacts',
            { clinic_id: clinicId, phone: patient.phone },
            { clinic_id: clinicId, phone: patient.phone, name: patient.name, email: patient.email, channel_type: 'whatsapp' }
        );
        console.log(`Contact for ${patient.name} (${contactId}) processed.`);

        // 3. Create Conversation if not exists
        const { id: conversationId } = await findOrCreate(
            'conversations',
            { clinic_id: clinicId, contact_id: contactId },
            { clinic_id: clinicId, contact_id: contactId, status: 'active', unread_count: 1 }
        );
        console.log(`Conversation for ${patient.name} (${conversationId}) processed.`);
    }

    // 4. Seed Messages (check if any messages exist for the clinic first)
    const { count: messageCount, error: countError } = await supabase
        .from('messages').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId);
    if (countError) throw countError;

    if (messageCount === 0) {
        const { data: contacts } = await supabase.from('contacts').select('id, phone').eq('clinic_id', clinicId);
        const contactMap = contacts.reduce((acc, c) => ({ ...acc, [c.phone]: c.id }), {});
        
        const { data: conversations } = await supabase.from('conversations').select('id, contact_id').eq('clinic_id', clinicId);
        const conversationMap = conversations.reduce((acc, c) => ({ ...acc, [c.contact_id]: c.id }), {});

        const messagesToInsert = messagesData.map(msg => {
            const contactId = contactMap[msg.contact_phone];
            if (!contactId) return null;
            const conversationId = conversationMap[contactId];
            if (!conversationId) return null;
            return {
                clinic_id: clinicId,
                contact_id: contactId,
                conversation_id: conversationId,
                content: msg.content,
                sender_type: msg.sender_type,
                sender_id: msg.sender_type === 'user' ? user.id : null,
                status: 'delivered',
                message_type: 'text',
            };
        }).filter(Boolean);

        if (messagesToInsert.length > 0) {
            const { error: messageError } = await supabase.from('messages').insert(messagesToInsert);
            if (messageError) throw new Error(`Erro ao popular mensagens: ${messageError.message}`);
            console.log("Mensagens inseridas com sucesso.");
        }
    } else {
        console.log("Mensagens já existem, pulando o seeding de mensagens.");
    }
    
    console.log('Banco de dados populado com sucesso!');
  } catch (error) {
    console.error('Erro durante o processo de seeding:', error.message);
    throw error;
  }
}