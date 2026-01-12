// Simple debugger utility
export const inboxDebugger = {
    logs: [],
    maxLogs: 100,

    log(message, data = null, type = 'info') {
        const entry = {
            timestamp: new Date().toISOString(),
            message,
            data,
            type
        };
        this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
        
        // Also log to console in dev
        if (process.env.NODE_ENV === 'development') {
            console.log(`[InboxDebugger:${type}]`, message, data || '');
        }
    },

    error(message, error) {
        this.log(message, { error: error?.message || error }, 'error');
    },

    warn(message, data) {
        this.log(message, data, 'warning');
    },

    getLogs() {
        return this.logs;
    },

    clearLogs() {
        this.logs = [];
    }
};