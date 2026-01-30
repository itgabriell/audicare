import { supabase, getClinicId } from './baseService.js';

export const getRepairs = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repair_tickets').select('*').eq('clinic_id', cid).order('created_at', { ascending: false });
    return data || [];
};
export const addRepair = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repair_tickets').insert([{ ...d, clinic_id: cid }]).select().single();
    if (error) throw error; return data;
};
export const updateRepair = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repair_tickets').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if (error) throw error; return data;
};
export const deleteRepair = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('repair_tickets').delete().eq('id', id).eq('clinic_id', cid);
    if (error) throw error;
};

export const getRepairsByPatientId = async (patientId) => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repair_tickets').select('*').eq('clinic_id', cid).eq('patient_id', patientId).order('created_at', { ascending: false });
    return data || [];
};
