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

    // --- Date Ranges Logic (Fixed for Timezones) ---
    // For "Today", we want from 00:00:00 to 23:59:59 LOCAL time, but query in UTC.
    // However, simplest robust way is to query [now - 24h] for daily stats or ensure 
    // the start of day is calculated correctly relative to the user's perception.

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1); // 24h ago logic or yesterday 00:00?
    // "Last 24h" usually means strictly [now - 24 hours]
    const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    // Week: Sunday to Saturday
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to safely execute a promise
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
        // 0: Appointments Today (Visualized as "Today's Schedule")
        safeQuery(
            supabase.from('appointments')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                // Using generic "today" range. 
                .gte('start_time', todayStart.toISOString())
                .lte('start_time', todayEnd.toISOString()),
            { count: 0 }
        ),
        // 1: Active Repairs - Fetch all, filter in JS
        safeQuery(
            supabase.from('repair_tickets')
                .select('status')
                .eq('clinic_id', clinicId),
            { data: [] }
        ),
        // 2: Leads 24h (Strict last 24h rolling window)
        safeQuery(
            supabase.from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('created_at', last24h.toISOString()),
            { count: 0 }
        ),
        // 3: Leads Month
        safeQuery(
            supabase.from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('created_at', firstDayOfMonth.toISOString()),
            { count: 0 }
        ),
        // 4: Sales Month
        safeQuery(
            supabase.from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .in('status', ['purchased', 'won', 'venda_realizada', 'Venda Realizada', 'Ganho']) // Added common variations
                .gte('created_at', firstDayOfMonth.toISOString()),
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
                .gte('created_at', firstDayOfMonth.toISOString()),
            { count: 0 }
        ),
        // 7: Week Appointments
        safeQuery(
            supabase.from('appointments')
                .select('start_time')
                .eq('clinic_id', clinicId)
                .gte('start_time', startOfWeek.toISOString())
                .lte('start_time', endOfWeek.toISOString())
                .order('start_time', { ascending: true }),
            { data: [] }
        ),
        // 8: Repairs Status Distribution
        safeQuery(
            supabase.from('repair_tickets')
                .select('status')
                .eq('clinic_id', clinicId),
            { data: [] }
        ),
        // 9: Leads Tags Distribution (Campaigns)
        safeQuery(
            supabase.from('leads')
                .select('tags')
                .eq('clinic_id', clinicId)
                .gte('created_at', firstDayOfMonth.toISOString()), // Filter by current month as requested
            { data: [] }
        )
    ]);

    // Process Active Repairs
    // Normalize status checks to avoid case/formatting issues
    const allRepairs = results[1].data || [];
    const activeRepairsCount = allRepairs.filter(r => {
        const s = (r.status || '').toLowerCase();
        return !['ready', 'delivered', 'concluído', 'concluido', 'entregue'].includes(s);
    }).length;

    // Process Leads Tags
    const leadsWithTags = results[9].data || [];
    const campaignStats = {};
    leadsWithTags.forEach(lead => {
        if (lead.tags && Array.isArray(lead.tags)) {
            lead.tags.forEach(tag => {
                campaignStats[tag] = (campaignStats[tag] || 0) + 1;
            });
        }
    });

    const campaignData = Object.entries(campaignStats).map(([name, count]) => ({ name, value: count }));

    return {
        metrics: {
            appointmentsToday: results[0].count || 0,
            activeRepairs: activeRepairsCount,
            leads24h: results[2].count || 0,
            leadsMonth: results[3].count || 0,
            salesMonth: results[4].count || 0,
            totalPatients: results[5].count || 0,
            claraInteractions: results[6].count || 0
        },
        charts: {
            weekAppointments: (results[7].data || []).map(a => ({ appointment_date: a.start_time })),
            repairsStatus: results[8].data || [],
            campaigns: campaignData
        }
    };
};
