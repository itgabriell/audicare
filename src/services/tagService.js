import { supabase, getClinicId } from './baseService.js';

export const getTags = async (page = 1, pageSize = 10, searchTerm = '') => {
    const clinicId = await getClinicId();
    if (!clinicId) return { data: [], count: 0 };

    let query = supabase.from('tags').select('*', { count: 'exact' }).eq('clinic_id', clinicId);
    if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);

    const { data, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    return { data: data || [], count: count || 0 };
};

export const addTag = async (tagData) => {
    const clinicId = await getClinicId();
    const { data, error } = await supabase.from('tags').insert([{ ...tagData, clinic_id: clinicId }]).select().single();
    if (error) throw error; return data;
};

export const deleteTag = async (id) => {
    const clinicId = await getClinicId();
    const { error } = await supabase.from('tags').delete().eq('id', id).eq('clinic_id', clinicId);
    if (error) throw error; return true;
};

export const addPatientTag = async (patientId, tagId) => {
    const { data, error } = await supabase.from('patient_tags').insert([{ patient_id: patientId, tag_id: tagId }]).select().single();
    if (error && error.code !== '23505') throw error;
    return data;
};

export const removePatientTag = async (patientId, tagId) => {
    const { error } = await supabase.from('patient_tags').delete().eq('patient_id', patientId).eq('tag_id', tagId);
    if (error) throw error;
};

export const getPatientTags = async (patientId) => {
    const { data } = await supabase.from('patient_tags').select('*, tag:tags(*)').eq('patient_id', patientId);
    return data || [];
};
