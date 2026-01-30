# Configuration Validation Panel Guide

The **Configuration Validation Panel** is a critical administrative tool designed to inspect, validate, and debug the application's runtime environment and connectivity settings.

## Key Features

### 1. Environment Validation
*   **Variables Inspection:** Lists critical environment variables such as `VITE_SUPABASE_URL`, `API_BASE_URL`, and Auth Keys.
*   **Security:** Sensitive values (Keys/Tokens) are masked by default but can be toggled visible for verification.
*   **Automatic Validation:** Checks if URLs are valid formats (must start with `http`) and if required keys are present.

### 2. Connectivity & Endpoint Health
*   **Live Checks:** Pings critical system endpoints (`Backend API`, `UAZAPI Status`, `Contacts API`) in real-time.
*   **Latency Tracking:** Measures the round-trip time (latency) for each check.
*   **Status Codes:** Displays HTTP status codes (200 OK, 401 Unauthorized, 500 Error).
    *   *Note:* A `401 Unauthorized` on a protected endpoint generally means the endpoint is *reachable* but requires a valid token, which counts as a partial success for connectivity checks.

### 3. Authentication Status
*   **JWT Inspection:** Decodes and displays the current user's Session Token (Header/Payload fragments).
*   **Expiry Tracking:** Shows exactly when the current session will expire.
*   **User Context:** Displays the currently authenticated user email.

### 4. Audit & History
*   **Audit Log:** Tracks actions taken within the panel (e.g., "Load Config", "Start Check", "Export").
*   **Export:** Allows downloading the current configuration state and check results as a JSON file for external support or debugging.

## How to Use

1.  **Access:** Click the **Settings (Gear)** icon located in the Inbox header, next to the Validation (Bug) icon.
2.  **Environment Tab:** Review the table to ensure all indicators are green ("Válido").
3.  **Connectivity Tab:** Click **"Executar Diagnóstico"** or **"Verificar Agora"** to run live checks.
    *   Green Check = Reachable & Healthy.
    *   Yellow Lock = Reachable but Auth Required (Normal for some checks if not fully logged in).
    *   Red X = Unreachable/Error.
4.  **Exporting:** Use the **"Exportar"** button to download a snapshot if you need to report an issue to the development team.

## Troubleshooting

*   **Invalid Config:** If a variable shows "Inválido", check your `.env` file or Vercel/Netlify environment settings.
*   **Unreachable Endpoints:** Check if the backend server is running or if the `API_BASE_URL` is correct.
*   **Auth Issues:** If Token shows "Nenhum token ativo", try logging out and back in.