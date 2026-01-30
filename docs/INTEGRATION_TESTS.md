# Integration Testing Guide

The `IntegrationTestPanel` is a comprehensive tool built into the frontend to validate the entire messaging stack (Frontend -> Backend -> UAZAPI -> Supabase).

## Features

1.  **End-to-End Validation**: Tests actual API endpoints, not just mocks.
2.  **Realtime Simulation**: Verifies that Webhook events are correctly propagated from Supabase to the UI via `WebhookReceiverService`.
3.  **Connectivity Checks**: Validates JWT tokens and Backend Health.
4.  **Offline Resilience**: Simulates network failure to test the offline queue mechanism.

## How to Use

1.  Navigate to the **Inbox** page.
2.  Click the **"Testes de Integração"** button in the bottom-left corner.
3.  Enter a valid **Test Phone Number** (e.g., your own WhatsApp number) in the sidebar.
4.  Click **"Executar Todos"** to run the full suite, or click the "Play" button next to specific tests.

## Test Cases

| Test ID | Name | Description |
| :--- | :--- | :--- |
| `jwt_validation` | **Token Validation** | Checks if the current Supabase session is valid. |
| `health_check` | **Health Check** | Pings the backend (`/api/wa/health-check`) to verify connectivity. |
| `fetch_contacts` | **Fetch Contacts** | Calls `/api/wa/contacts` and validates response format. |
| `send_message` | **Send Message** | Sends a real WhatsApp text message to the configured test number. |
| `simulate_webhook` | **Webhook Sim** | Inserts a record into `messages` table and waits for the frontend to receive it via Realtime. |
| `simulate_offline` | **Offline Mode** | Forces the internal service state to 'offline', attempts to send a message, and verifies it was queued. |

## Troubleshooting

*   **Health Check Fails**: Ensure the backend server is running and the `apiConfig.js` URL is correct.
*   **Send Message Fails**: Verify the UAZAPI instance is connected and the test phone number is valid (international format).
*   **Webhook Sim Fails**: Check if Supabase Realtime is enabled for the `messages` table and if RLS policies allow insertion.