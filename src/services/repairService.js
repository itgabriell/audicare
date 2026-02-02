import { supabase } from './baseService.js';

export const getRepairs = async () => {
    const { data } = await supabase.from('repair_tickets').select('*').order('created_at', { ascending: false });
    return data || [];
};
export const addRepair = async (d) => {
    const { data, error } = await supabase.from('repair_tickets').insert([{ ...d }]).select().single();
    if (error) throw error; return data;
};
export const updateRepair = async (id, u) => {
    const { data, error } = await supabase.from('repair_tickets').update(u).eq('id', id).select().single();
    if (error) throw error; return data;
};
export const deleteRepair = async (id) => {
    const { error } = await supabase.from('repair_tickets').delete().eq('id', id);
    if (error) throw error;
};

export const getRepairsByPatientId = async (patientId) => {
    // Schema workaround: repair_tickets lacks patient_id. Link via patient_name/phone.
    // 1. Get patient details
    const { data: patient } = await supabase.from('patients').select('name, phone').eq('id', patientId).single();
    if (!patient) return [];

    // 2. Search repairs by exact name match (best effort)
    const { data } = await supabase
        .from('repair_tickets')
        .select('*')
        .eq('patient_name', patient.name)
        .order('created_at', { ascending: false });

    return data || [];
};
