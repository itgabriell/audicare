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

    // Helper to safely execute a promise and return a default
    const safeQuery = async (promise, defaultValue) => {
        try {
            const result = await promise;
            if (result.error) throw result.error;
            return result;
        } catch (err) {
            console.error("Dashboard query error:", err);
            return defaultValue;
        }
    };

    const results = await Promise.all([
        // 0: Appointments Today
        safeQuery(
            supabase.from('appointments')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('appointment_date', todayStart)
                .lte('appointment_date', todayEnd),
            { count: 0 }
        ),
        // 1: Active Repairs - Fetch all statuses and filter in JS to avoid 400 errors with complex query filters
        safeQuery(
            supabase.from('repair_tickets')
                .select('status')
                .eq('clinic_id', clinicId),
            { data: [] }
        ),
        // 2: Leads 24h
        safeQuery(
            supabase.from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('created_at', last24h),
            { count: 0 }
        ),
        // 3: Leads Month
        safeQuery(
            supabase.from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('created_at', firstDayOfMonth),
            { count: 0 }
        ),
        // 4: Sales Month
        safeQuery(
            supabase.from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .in('status', ['purchased', 'won', 'venda_realizada', 'Venda Realizada'])
                .gte('created_at', firstDayOfMonth),
            { count: 0 }
        ),
        // 5: Total Patients
        safeQuery(
            supabase.from('patients')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId),
            { count: 0 }
        ),
        // 6: Clara Interactions
        safeQuery(
            supabase.from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('created_at', firstDayOfMonth),
            { count: 0 }
        ),
        // 7: Week Appointments
        safeQuery(
            supabase.from('appointments')
                .select('appointment_date')
                .eq('clinic_id', clinicId)
                .gte('appointment_date', startOfWeek.toISOString())
                .lte('appointment_date', endOfWeek.toISOString())
                .order('appointment_date', { ascending: true }),
            { data: [] }
        ),
        // 8: Repairs Status Distribution
        safeQuery(
            supabase.from('repair_tickets')
                .select('status')
                .eq('clinic_id', clinicId),
            { data: [] }
        )
    ]);

    // Process Active Repairs count from JS array
    const allRepairs = results[1].data || [];
    const activeRepairsCount = allRepairs.filter(r => !['ready', 'delivered', 'Concluído'].includes(r.status)).length;

    return {
        metrics: {
            charts: {
                weekAppointments: results[7].data || [],
                repairsStatus: results[8].data || []
            }
        };
    };
