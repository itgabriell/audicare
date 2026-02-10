import { supabase } from './baseService.js';

export const getRepairs = async () => {
    const cid = await getClinicId();
    if (!cid) return [];

    // Select * but ensure clinic_id filter. 
    // If no clinic_id is present in DB for old records, they won't show until migrated.
    const { data } = await supabase
        .from('repair_tickets')
        .select('*')
        .eq('clinic_id', cid)
        .order('created_at', { ascending: false });
    return data || [];
};

export const addRepair = async (d) => {
    const cid = await getClinicId();
    // Safety check
    if (!cid) throw new Error("Clinic ID not found");

    const { data, error } = await supabase
        .from('repair_tickets')
        .insert([{ ...d, clinic_id: cid }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateRepair = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase
        .from('repair_tickets')
        .update(u)
        .eq('id', id)
        .eq('clinic_id', cid)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteRepair = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase
        .from('repair_tickets')
        .delete()
        .eq('id', id)
        .eq('clinic_id', cid);
    if (error) throw error;
};

export const getRepairsByPatientId = async (patientId) => {
    const cid = await getClinicId();
    // 1. Get patient details
    const { data: patient } = await supabase
        .from('patients')
        .select('name, phone')
        .eq('id', patientId)
        .eq('clinic_id', cid)
        .single();

    if (!patient) return [];

    // 2. Search repairs by exact name match AND clinic_id
    const { data } = await supabase
        .from('repair_tickets')
        .select('*')
        .eq('patient_name', patient.name)
        .eq('clinic_id', cid)
        .order('created_at', { ascending: false });

    return data || [];
};

// --- MIGRATION HELPER ---
export const migrateRepairsToClinic = async () => {
    const cid = await getClinicId();
    if (!cid) return { success: false, message: "No clinic ID" };

    // 1. Find repairs with NO clinic_id (orphaned)
    // Note: This relies on the user having permission to see rows with null clinic_id.
    // If RLS is strict, this might return empty, but it's worth a try for legacy data.
    const { data: orphans, error: fetchError } = await supabase
        .from('repair_tickets')
        .select('id')
        .is('clinic_id', null);

    if (fetchError) {
        console.error("Migration fetch error:", fetchError);
        return { success: false, message: "Erro ao buscar reparos antigos." };
    }

    if (!orphans || orphans.length === 0) {
        return { success: true, count: 0, message: "Nenhum reparo antigo encontrado." };
    }

    // 2. Update them
    const ids = orphans.map(r => r.id);
    const { error: updateError } = await supabase
        .from('repair_tickets')
        .update({ clinic_id: cid })
        .in('id', ids);

    if (updateError) {
        console.error("Migration update error:", updateError);
        return { success: false, message: "Erro ao atualizar reparos." };
    }

    return { success: true, count: ids.length, message: `${ids.length} reparos recuperados com sucesso!` };
};
