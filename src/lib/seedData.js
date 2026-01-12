// This file is intentionally modified to disable automatic data seeding.
// The functions remain for reference but will not execute the seeding process.

const log = (message, data) => console.log(`[SeedData] ${message}`, data || '');

/**
 * The seedDatabase function is now disabled for the appointments/inbox module.
 * Data should be entered manually through the application interface to ensure
 * it is realistic and relevant.
 * 
 * @param {string} clinicId - The ID of the clinic.
 * @returns {Promise<{data: string}>} A promise that resolves with a message indicating seeding is disabled.
 */
export const seedDatabase = async (clinicId) => {
    console.log("seedDatabase function called, but seeding is disabled.");
    log('Seed disabled for appointments/inbox module - use manual data entry.');
    
    // Return early to prevent any data from being seeded.
    return Promise.resolve({ data: 'Seeding is disabled. Please use manual data entry.' });
};