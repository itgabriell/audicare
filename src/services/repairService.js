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

    // Use RPC to bypass RLS and update raw records
    const { data, error } = await supabase.rpc('migrate_repairs_rpc', { target_clinic_id: cid });

    if (error) {
        console.error("Migration RPC error:", error);
        // Fallback to client-side if RPC fails (e.g., function not created yet)
        return { success: false, message: "Erro na migração (RPC). Verifique se o SQL foi rodado." };
    }

    return {
        success: true,
        count: data?.count || 0,
        message: `Migração concluída! ${data?.count || 0} registros recuperados.`
    };
};
