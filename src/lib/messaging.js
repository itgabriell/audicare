import { supabase } from '@/lib/customSupabaseClient';

export async function findOrCreateConversation(phone, clinicId, channelType = 'whatsapp') {
    // 1. Check if contact exists
    let { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone)
        .eq('clinic_id', clinicId)
        .maybeSingle();

    // 2. Create contact if not exists
    if (!contact) {
        const { data: newContact, error: createError } = await supabase
            .from('contacts')
            .insert({
                phone,
                name: phone, // Default name
                clinic_id: clinicId,
                channel_type: channelType,
                status: 'active'
            })
            .select()
            .single();
            
        if (createError) throw createError;
        contact = newContact;
    }

    // 3. Check if conversation exists
    let { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('clinic_id', clinicId)
        .maybeSingle();

    // 4. Create conversation if not exists
    if (!conversation) {
        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
                contact_id: contact.id,
                clinic_id: clinicId,
                status: 'open',
                channel_type: channelType,
                unread_count: 0
            })
            .select()
            .single();
            
        if (convError) throw convError;
        conversation = newConv;
    }

    return conversation;
}

export async function fetchContactDetails(contactId) {
    if (!contactId) return null;

    // 1. Get contact
    const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();

    if (error) throw error;
    if (!contact) return null;

    // 2. Try to find linked patient via phone in patient_phones
    const { data: patientPhone } = await supabase
        .from('patient_phones')
        .select('patient_id, patients:patient_id(id, name)')
        .eq('phone', contact.phone)
        .limit(1)
        .maybeSingle();

    if (patientPhone && patientPhone.patients) {
        return {
            ...contact,
            patient_id: patientPhone.patient_id,
            patient_name: patientPhone.patients.name,
            // Add other patient fields if needed
        };
    }

    // Fallback: check patients table directly (legacy phone field)
    const { data: patient } = await supabase
        .from('patients')
        .select('id, name')
        .eq('phone', contact.phone)
        .limit(1)
        .maybeSingle();

    if (patient) {
        return {
            ...contact,
            patient_id: patient.id,
            patient_name: patient.name,
        };
    }

    return contact;
}

export async function linkContactToPatient(contactId, patientId) {
    // 1. Get contact phone
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('phone')
        .eq('id', contactId)
        .maybeSingle();
    
    if (contactError) throw contactError;
    if (!contact) throw new Error('Contact not found');

    // 2. Add to patient_phones
    const { error: insertError } = await supabase
        .from('patient_phones')
        .insert({
            patient_id: patientId,
            phone: contact.phone,
            is_whatsapp: true,
            phone_type: 'mobile'
        });
    
    if (insertError) {
        // Ignore unique violation (already linked)
        if (insertError.code === '23505') {
             return; 
        }
        throw insertError;
    }
}
