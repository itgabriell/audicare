import { supabase, getClinicId, getUserId } from './baseService.js';

/**
 * Fetches a paginated list of patients for the current clinic.
 * @param {number} [page=1] - Page number.
 * @param {number} [pageSize=10] - Number of items per page.
 * @param {string} [searchTerm=''] - Search term for name, CPF, or phone.
 * @param {string} [sortBy='created_at'] - Field to sort by.
 * @param {string} [sortOrder='desc'] - Sort order ('asc' or 'desc').
 * @returns {Promise<{data: Array, count: number}>} Patients list and total count.
 */
export const getPatients = async (page = 1, pageSize = 10, searchTerm = '', sortBy = 'created_at', sortOrder = 'desc') => {
    const clinicId = await getClinicId();
    if (!clinicId) return { data: [], count: 0 };

    let query = supabase
        .from('patients')
        .select('*, tags:patient_tags(tag:tags(*))', { count: 'exact' })
        .eq('clinic_id', clinicId);

    if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count };
};

export const searchPatientsSimple = async (term) => {
    const clinicId = await getClinicId();
    if (!clinicId) return [];

    let query = supabase
        .from('patients')
        .select('id, name, cpf, phone')
        .eq('clinic_id', clinicId);

    if (term) {
        query = query.or(`name.ilike.%${term}%,cpf.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data, error } = await query.limit(20);
    if (error) console.error('Error searching patients:', error);
    return data || [];
};

/**
 * Retrieves a single patient by ID.
 * @param {string} id - Patient ID.
 * @returns {Promise<Object|null>} Patient object or null.
 */
export const getPatientById = async (id) => {
    const clinicId = await getClinicId();
    if (!clinicId) return null;

    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .eq('clinic_id', clinicId)
        .single();

    if (error) return null;
    return data;
};

/**
 * Adds a new patient.
 * @param {Object} patientData - Patient data.
 * @returns {Promise<Object>} Created patient object.
 */
export const addPatient = async (patientData) => {
    const clinicId = await getClinicId();
    if (!clinicId) throw new Error('Clinic ID not found');
    const userId = await getUserId();

    const cleanData = Object.fromEntries(Object.entries(patientData).map(([k, v]) => [k, v === undefined ? null : v]));

    const { data, error } = await supabase
        .from('patients')
        .insert([{ ...cleanData, clinic_id: clinicId, created_by: userId, created_at: new Date().toISOString() }])
        .select().single();

    if (error) throw error;
    return data;
};

/**
 * Updates an existing patient.
 * @param {string} patientId - Patient ID.
 * @param {Object} updates - Fields to update.
 * @returns {Promise<Object>} Updated patient object.
 */
export const updatePatient = async (patientId, updates) => {
    const clinicId = await getClinicId();
    const cleanUpdates = Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v === undefined ? null : v]));

    const { data, error } = await supabase
        .from('patients')
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq('id', patientId).eq('clinic_id', clinicId).select().single();

    if (error) throw error;
    return data;
};

/**
 * Deletes a patient.
 * @param {string} patientId - Patient ID.
 * @returns {Promise<void>}
 */
export const deletePatient = async (patientId) => {
    const clinicId = await getClinicId();
    const { error } = await supabase.from('patients').delete().eq('id', patientId).eq('clinic_id', clinicId);
    if (error) throw error;
};

/**
 * Checks if a patient with the same name or CPF already exists.
 * @param {string} name - Patient name.
 * @param {string} cpf - Patient CPF.
 * @returns {Promise<boolean>} True if duplicate exists.
 */
export const checkDuplicatePatient = async (name, cpf) => {
    const clinicId = await getClinicId();
    if (!clinicId) return false;

    const conditions = [];
    if (name) conditions.push(`name.eq."${name.replace(/"/g, '""')}"`);
    if (cpf) conditions.push(`cpf.eq."${cpf.replace(/"/g, '""')}"`);

    if (conditions.length === 0) return false;

    const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(conditions.join(','));

    if (error) return false;
    return data && data.length > 0;
};

/**
 * Merges two patient profiles.
 * Moves all related records (phones, repairs, appointments) from sourceId to targetId.
 * Copies missing fields from source to target.
 * Deletes source entry.
 * @param {string} targetId - ID of the patient to keep.
 * @param {string} sourceId - ID of the patient to delete (merge into target).
 * @returns {Promise<boolean>} True if successful.
 */
export const mergePatients = async (targetId, sourceId) => {
    const clinicId = await getClinicId();
    if (!clinicId) throw new Error("Clinic ID not found");

    // 1. Fetch Source Patient
    const { data: source, error: sourceError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', sourceId)
        .eq('clinic_id', clinicId)
        .single();

    if (sourceError || !source) throw new Error("Paciente de origem não encontrado.");

    // 2. Fetch Target Patient
    const { data: target, error: targetError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', targetId)
        .eq('clinic_id', clinicId)
        .single();

    if (targetError || !target) throw new Error("Paciente de destino não encontrado.");

    // 3. Prepare Updates for Target
    const updates = {};
    const fieldsToCheck = [
        'email', 'fiscal_email', 'birthdate', 'gender',
        'document', 'zip_code', 'street', 'number', 'complement',
        'neighborhood', 'city', 'state',
        'allergies', 'medications'
    ];

    fieldsToCheck.forEach(field => {
        if (!target[field] && source[field]) {
            updates[field] = source[field];
        }
    });

    // Special handling for text blobs
    if (source.medical_history) {
        updates.medical_history = target.medical_history
            ? `${target.medical_history}\n\n[Histórico mesclado]:\n${source.medical_history}`
            : source.medical_history;
    }
    if (source.notes) {
        updates.notes = target.notes
            ? `${target.notes}\n\n[Notas mescladas]:\n${source.notes}`
            : source.notes;
    }

    // 4. Update Target Patient
    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', targetId);
        if (updateError) throw updateError;
    }

    // 5. Move Related Records
    await supabase.from('patient_phones').update({ patient_id: targetId }).eq('patient_id', sourceId);
    await supabase.from('repair_tickets').update({ patient_id: targetId }).eq('patient_id', sourceId);
    await supabase.from('appointments').update({ patient_id: targetId }).eq('patient_id', sourceId);

    // 6. Delete Source Patient
    const { error: deleteError } = await supabase.from('patients').delete().eq('id', sourceId);
    if (deleteError) throw deleteError;

    return true;
};
