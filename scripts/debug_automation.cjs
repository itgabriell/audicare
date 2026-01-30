
try {
    console.log("Loading ChatwootBackendService...");
    require('./backend/services/ChatwootBackendService.js');
    console.log("✅ ChatwootBackendService loaded.");

    console.log("Loading AutomationManager...");
    require('./backend/services/AutomationManager.js');
    console.log("✅ AutomationManager loaded.");
} catch (e) {
    console.error("❌ ERROR:", e);
    console.error(e.stack);
}
