# UAZAPI Integration Debug Guide

This guide details the usage of the embedded API Debug Panel for monitoring and troubleshooting the WhatsApp integration.

## 1. Accessing the Debug Panel
The debug panel is available in two scenarios:
1.  **Development Mode:** Automatically available (fab button in bottom-right).
2.  **Production Mode:** Append `?debug=true` to the Inbox URL (e.g., `/inbox?debug=true`).

## 2. Features

### Live Logs Tab
*   **Request Tracking:** Monitors every HTTP request sent to the backend proxy (`/api/wa`).
*   **Status Indicators:** Color-coded status codes (Green=200, Red=400/500).
*   **Payload Inspection:** Click any log entry to expand and view the JSON Request Body and Response.
*   **Timing:** Shows request duration in milliseconds.

### API Tester Tab
*   **Manual Message Send:** Allows sending a test message to a specific number directly from the UI to verify endpoint connectivity without using the main chat UI.
*   **Endpoint Triggers:** Quick buttons to trigger `GET /contacts` and `GET /health`.

### Status Tab
*   **Connection Health:** Checks if the backend proxy and UAZAPI instance are reachable.
*   **Cache Stats:** Displays the number of messages and items in the IndexedDB cache.
*   **Token Validation:** Indirectly verifies Supabase session validity via API calls.

## 3. Common Issues & Resolutions

| Status | Error | Likely Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **401** | Unauthorized | Supabase Session expired | Log out and log back in to refresh token. |
| **404** | Not Found | Endpoint URL typo | Check `apiConfig.js` paths. |
| **500** | Server Error | Backend Proxy / UAZAPI error | Check Edge Function logs in Supabase Dashboard. |
| **0** | Network Error | CORS or Offline | Check browser console for CORS errors; check internet. |

## 4. Architecture
The `debugService` acts as a singleton interceptor. The `whatsappService` calls `debugService.logRequest` before `fetch` and `debugService.logResponse` after `fetch`. This ensures logs are captured even if the UI fails to render.

## 5. Error Handling Strategy
The system implements an exponential backoff strategy for polling. If the API is unreachable:
1.  `whatsappService` catches the error and returns `null`.
2.  `useRealtimeSync` detects the failure and increments a failure counter.
3.  The polling interval increases (5s -> 10s -> 20s -> 60s) to prevent console spam and reduce server load.
4.  Once a successful request occurs, the interval resets to 5s.