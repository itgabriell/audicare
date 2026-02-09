import { supabase, getClinicId } from './baseService.js';

export const getDashboardMetrics = async () => {
    const clinicId = await getClinicId();
    if (!clinicId) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: leads } = await supabase.from('leads').select('*').eq('clinic_id', clinicId).gte('created_at', thirtyDaysAgo.toISOString());
    if (!leads) return null;
    const scheduled = leads.filter(l => ['scheduled', 'arrived', 'purchased'].includes(l.status)).length;
    const purchased = leads.filter(l => l.status === 'purchased').length;
    return {
        totalLeadsMonth: leads.length,
        funnel: { total: leads.length, scheduled, purchased },
    };
};

export const getDashboardStats = async () => {
    const clinicId = await getClinicId();
    if (!clinicId) return null;

    const now = new Date();

    // Calculate start and end of current week (Sunday to Saturday)
    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const yesterday = new Date(now);
    yesterday.setHours(yesterday.getHours() - 24);
    const last24h = yesterday.toISOString();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
        appointmentsResult,
        activeRepairsResult,
        leads24hResult,
        leadsMonthResult,
        salesMonthResult,
        totalPatientsResult,
        claraInteractionsResult,
        weekAppointmentsResult,
        repairsDataResult
    ] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('appointment_date', todayStart).lte('appointment_date', todayEnd),
        // Active repairs: everything except 'ready' (Concluído) and 'delivered' (if exists). 
        // Note: repair_tickets currently seems to lack clinic_id, so we query globally or filtering if possible.
        // using logic from Repairs.jsx which shows everything.
        supabase.from('repair_tickets').select('id', { count: 'exact', head: true }).neq('status', 'ready'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', last24h),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', firstDayOfMonth),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).in('status', ['purchased', 'won', 'venda_realizada', 'Venda Realizada']).gte('created_at', firstDayOfMonth),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', firstDayOfMonth).then(res => res).catch(() => ({ count: 0 })),
        supabase.from('appointments').select('appointment_date').eq('clinic_id', clinicId).gte('appointment_date', startOfWeek.toISOString()).lte('appointment_date', endOfWeek.toISOString()).order('appointment_date', { ascending: true }),
        supabase.from('repair_tickets').select('status')
    ]);

    return {
        metrics: {
            appointmentsToday: appointmentsResult.count || 0,
            activeRepairs: activeRepairsResult.count || 0,
            leads24h: leads24hResult.count || 0,
            leadsMonth: leadsMonthResult.count || 0,
            salesMonth: salesMonthResult.count || 0,
            totalPatients: totalPatientsResult.count || 0,
            claraInteractions: claraInteractionsResult.count || 0
        },
        charts: {
            weekAppointments: weekAppointmentsResult.data || [],
            repairsStatus: repairsDataResult.data || []
        }
    };
};
