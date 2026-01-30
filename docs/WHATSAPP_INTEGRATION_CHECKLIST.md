# ✅ WhatsApp Integration Verification Checklist

**Auditor:** Hostinger Horizons
**Date:** 2025-11-24

## 1. Message Sending Flow
- [ ] **Endpoint:** `POST /api/wa/send-text` is used.
- [ ] **Payload:** Request body format is strictly `{ "to": "...", "text": "..." }`.
- [ ] **Auth:** `Authorization: Bearer <token>` header is present.
- [ ] **Optimistic UI:** Message appears instantly before server response.
- [ ] **Feedback:** Visual indicator changes from "sending" to "sent".
- [ ] **Cleaning:** Input field clears after send.

## 2. Message Receiving Flow (Webhook/Polling)
- [ ] **Polling:** `useWhatsApp` hook runs every 5s (active tab) / 30s (background).
- [ ] **Deduplication:** Frontend filters out messages with duplicate IDs.
- [ ] **Ordering:** Messages sorted by timestamp (oldest to newest).
- [ ] **Notifications:** Audio plays only for incoming messages (not self-sent).
- [ ] **Conversation List:** Updates "Last Message" preview and timestamp.

## 3. Media Handling
- [ ] **Audio Recording:** Browser permission requested and handled.
- [ ] **Audio Upload:** Uses `FormData` with file field.
- [ ] **Audio Playback:** `AudioPlayer` component renders and plays valid URLs.
- [ ] **File Attachment:** (If implemented) correctly sends via `/send-media`.

## 4. Security & Config
- [ ] **HTTPS:** All API calls use `https://`.
- [ ] **Token Storage:** Tokens managed via Supabase Auth (not LocalStorage raw).
- [ ] **Sanitization:** Input text doesn't break UI (basic XSS check).
- [ ] **Environment:** No hardcoded `localhost` or secrets in client code.

## 5. Error Handling
- [ ] **401 Unauthorized:** Redirects to login or shows session expired toast.
- [ ] **500 Server Error:** Shows friendly "Try again" message, logs error to debugger.
- [ ] **Offline:** Handled gracefully without crashing app.

## 6. Performance
- [ ] **Load Time:** Contact list loads < 2s.
- [ ] **Message Scroll:** Chat window auto-scrolls to bottom on load.
- [ ] **Memory:** `setInterval` is cleared on component unmount.