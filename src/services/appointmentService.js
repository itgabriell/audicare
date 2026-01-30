import { supabase, getClinicId } from './baseService.js';

/**
 * Fetches appointments filtered by date range.
 * @param {Object} filters - Filter criteria.
 * @param {string} [filters.startDate] - Start date (YYYY-MM-DD).
 * @param {string} [filters.endDate] - End date (YYYY-MM-DD).
 * @returns {Promise<Array>} List of appointments with patient details.
 */
export const getAppointments = async (filters = {}) => {
    const clinicId = await getClinicId();
    if (!clinicId) return [];

    let query = supabase
        .from('appointments')
        .select('*, patient:patients(id, name, phone, cpf)')
        .eq('clinic_id', clinicId);

    if (filters.startDate) query = query.gte('appointment_date', filters.startDate);
    if (filters.endDate) query = query.lte('appointment_date', filters.endDate);

    const { data, error } = await query.order('appointment_date', { ascending: true });
    if (error) throw error;

    return data.map(apt => ({
        ...apt,
        contact: apt.patient ? { id: apt.patient.id, name: apt.patient.name } : { name: 'Paciente' }
    }));
};

/**
 * Adds a new appointment.
 * @param {Object} d - Appointment data.
 * @returns {Promise<Object>} Created appointment object.
 */
export const addAppointment = async (d) => {
    const cid = await getClinicId();
    const { id, ...dataToInsert } = d;

    const { data, error } = await supabase
        .from('appointments')
        .insert([{ ...dataToInsert, clinic_id: cid }])
        .select().single();

    if (error) throw error;
    return data;
};

/**
 * Updates an appointment.
 * Supports overload: updateAppointment(id, updates) or updateAppointment({ id, ...updates })
 * @param {string|Object} arg1 - ID or update object.
 * @param {Object} [arg2] - Update object if arg1 is ID.
 * @returns {Promise<Object>} Updated appointment object.
 */
export const updateAppointment = async (arg1, arg2) => {
    const cid = await getClinicId();

    let id, updates;

    if (typeof arg1 === 'object' && arg1 !== null) {
        id = arg1.id;
        updates = { ...arg1 };
        delete updates.id;
    } else {
        id = arg1;
        updates = arg2;
    }

    if (!id || !updates) throw new Error("Dados inválidos para atualização.");

    const allowedColumns = [
        'clinic_id', 'patient_id', 'professional_id', 'appointment_date',
        'status', 'appointment_type', 'duration', 'notes', 'obs',
        'contact_id', 'title', 'start_time', 'end_time',
        'location', 'professional_name', 'arrival_time', 'completion_time'
    ];

    const cleanUpdates = Object.keys(updates)
        .filter(key => allowedColumns.includes(key))
        .reduce((obj, key) => { obj[key] = updates[key]; return obj; }, {});

    const { data, error } = await supabase
        .from('appointments')
        .update(cleanUpdates)
        .eq('id', id).eq('clinic_id', cid).select().single();

    if (error) throw error;
    return data;
};

/**
 * Deletes an appointment.
 * @param {string} id - Appointment ID.
 * @returns {Promise<{success: boolean}>} result.
 */
export const deleteAppointment = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('clinic_id', cid);
    if (error) throw error;
    return { success: true };
};

/**
 * Gets appointments for a specific patient.
 * @param {string} patientId - Patient ID.
 * @returns {Promise<Array>} List of patient appointments.
 */
export const getPatientAppointments = async (patientId) => {
    const cid = await getClinicId();
    if (!cid) return [];
    const { data } = await supabase.from('appointments').select('*').eq('clinic_id', cid).eq('patient_id', patientId).order('appointment_date', { ascending: false });
    return data || [];
};
