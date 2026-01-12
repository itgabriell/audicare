# Post-Adjustment Verification Checklist

This document outlines the necessary steps to verify the correct configuration and functionality of the Audicare Clinic System after any adjustments, especially those related to API base URLs and backend connectivity.

## 1. Configuration Changes Made

This checklist assumes the following critical configuration changes have been implemented:

*   **`VITE_API_BASE_URL`**: Explicitly set to `https://api.audicarefono.com.br` in `.env.local` and `.env.example`.
*   **Codebase Audit**: All hardcoded `localhost` references for API calls have been removed or replaced with `API_BASE_URL` from `src/config/apiConfig.js`.
*   **`apiConfig.js`**: Ensured that the `getBaseUrl` function prioritizes environment variables and falls back **only** to the production URL (`https://api.audicarefono.com.br`).
*   **Diagnostic Tools**: The `ConfigurationStatusPanel` and `DiagnosticsPanel` have been integrated into the Inbox debug tools to provide real-time validation.
*   **Automatic Validation**: The `useConfigurationValidator` hook and `ConfigValidationBanner` are active to provide immediate feedback on critical configuration issues.

## 2. Verification Steps

Perform these steps in order to ensure the system is functioning correctly after configuration adjustments.

### Step 1: Verify `VITE_API_BASE_URL` is `https://api.audicarefono.com.br`

*   **Action**: Open your project's `.env.local` file (and `.env.example` if applicable).
*   **Expected Result**: Both `VITE_API_BASE_URL` and `VITE_API_URL` should be explicitly set to `https://api.audicarefono.com.br`.