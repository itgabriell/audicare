# Webhook Receiver & Realtime Sync

Since this is a Single Page Application (SPA) without a custom backend server, we cannot expose a traditional `POST /webhook` endpoint directly in the frontend code.

Instead, the architecture relies on **Supabase Realtime**:

1.  **External Flow**: UAZAPI (WhatsApp Provider) -> Supabase Edge Function / n8n -> Supabase Database (`messages` table).
2.  **Internal Flow**: Supabase Database -> Realtime Channel -> Frontend (`WebhookReceiverService`).

## Service: `WebhookReceiverService`

Located in `src/services/webhookReceiverService.js`, this singleton service is responsible for:

1.  **Connection Management**: Establishes and monitors the WebSocket connection to Supabase.
2.  **Event Parsing**: Listens for `INSERT` and `UPDATE` events on `messages` and `contacts` tables.
3.  **Deduplication**: Prevents processing the same message event multiple times using a `Set` of IDs.
4.  **Broadcasting**: Notifies subscribers (React hooks) of relevant changes.

### Supported Events

*   **`new_message`**: Triggered when a row is inserted into `messages`.
    *   Updates conversation list.
    *   Plays notification sound.
    *   Updates active chat window.
*   **`message_update`**: Triggered when a row in `messages` is updated (e.g., status changes from `sent` to `read`).
    *   Updates read receipts in UI.
*   **`contact_update`**: Triggered when `contacts` table changes (e.g., profile picture update).
*   **`connection_status`**: Updates the UI "Online/Offline" indicator.

## Usage in Components

The `useRealtimeSync` hook consumes this service. Components should generally use the hook rather than the service directly.