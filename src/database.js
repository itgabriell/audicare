export const updateAppointment = async (id, updates) => {
    const cid = await getClinicId();
    
    // --- VERSÃO CORRIGIDA FINAL ---
    console.log('[DB] Iniciando updateAppointment - VERSÃO FINAL');

    // 1. Lista Branca (Allowlist)
    const allowedColumns = [
        'clinic_id', 
        'patient_id', 
        'professional_id', 
        'appointment_date', 
        'status', 
        'appointment_type', 
        'duration', 
        'notes', 
        'obs',
        'contact_id',
        'title',
        'start_time',
        'end_time'
    ];

    // 2. Filtragem
    const cleanUpdates = Object.keys(updates)
        .filter(key => allowedColumns.includes(key))
        .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
        }, {});

    // 3. Regra de Negócio: Se professional_id for nulo, atribui Dra. Karine
    if (!cleanUpdates.professional_id) {
        cleanUpdates.professional_id = 'd717c381-7600-4ce5-a6e8-cb411533d1e6'; 
    }

    console.log('[DB] Update Appointment Payload Limpo:', cleanUpdates);

    const { data, error } = await supabase
        .from('appointments')
        .update(cleanUpdates)
        .eq('id', id)
        .eq('clinic_id', cid)
        .select()
        .single();
        
    if(error) {
        console.error('[DB] Erro no Update:', error);
        throw error;
    } 
    return data;
};