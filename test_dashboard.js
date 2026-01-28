
import { supabase } from './src/lib/customSupabaseClient.js';
import { getDashboardStats } from './src/database.js';

async function runTest() {
    console.log("1. Authenticating...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'gabrieldes@gmail.com',
        password: 'Javalang1'
    });

    if (error) {
        console.error("Login failed:", error.message);
        process.exit(1);
    }

    console.log("Login successful! User ID:", data.user.id);

    console.log("2. Fetching Dashboard Stats...");
    const start = performance.now();
    try {
        const stats = await getDashboardStats();
        const end = performance.now();

        console.log(`Stats fetched in ${(end - start).toFixed(2)}ms`);
        console.log("--- METRICS ---");
        console.table(stats.metrics);

        console.log("--- CHARTS DATA SAMPLE ---");
        console.log("Week Appointments Length:", stats.charts.weekAppointments.length);
        if (stats.charts.weekAppointments.length > 0) {
            console.log("First appointment:", stats.charts.weekAppointments[0]);
            console.log("Last appointment:", stats.charts.weekAppointments[stats.charts.weekAppointments.length - 1]);
        }

        console.log("Repairs Status Length:", stats.charts.repairsStatus.length);

        // Validação simples
        if (stats.charts.weekAppointments.length > 50) {
            console.log("✅ SUCCESS: Week appointments limit is working (>50 items returned).");
        } else {
            console.log("ℹ️ NOTE: Week appointments count is", stats.charts.weekAppointments.length);
        }

    } catch (err) {
        console.error("Error in getDashboardStats:", err);
    }
}

runTest();
