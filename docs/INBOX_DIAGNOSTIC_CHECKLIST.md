# Inbox Diagnostic & Verification Checklist

This document provides a comprehensive checklist for verifying, debugging, and maintaining the Inbox (WhatsApp/Messaging) stack.

## 1. Frontend Responsibilities Verification
- [ ] **Page Load:** `src/pages/Inbox.jsx` loads without runtime errors.
- [ ] **Component Mount:** `WhatsAppWeb` component mounts correctly.
- [ ] **Hook Initialization:** `useWhatsApp` hook initializes state (loading=true, error=null).
- [ ] **Config Fetch:** Frontend successfully fetches initial phone config from Supabase.
- [ ] **Polling/Socket:** Frontend initiates polling interval (default 5s) or connects WebSocket.

## 2. API & Route Verification
**Base URL:** `https://api.audicarefono.com.br/api/wa`

- [ ] **Health Check:** `GET /health-check` returns 200 OK.
- [ ] **Contacts List:** `GET /contacts` returns an array of contacts.
- [ ] **Chat History:** `GET /chat-history/:phone` returns array of messages.
- [ ] **Send Text:** `POST /send-text` accepts `{ phone, message }` and returns success.
- [ ] **Send Media:** `POST /send-media` handles FormData correctly.

## 3. Authentication Verification
- [ ] **Token Presence:** All requests must include `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`.
- [ ] **Token Validity:** Token must not be expired.
- [ ] **Handling 401:** Frontend must redirect to login or refresh token on 401 response.

## 4. JSON Processing & Data Integrity
- [ ] **Content-Type:** Requests send `Content-Type: application/json` (except FormData).
- [ ] **Response Parsing:** Frontend correctly uses `.json()` on responses.
- [ ] **Empty States:** Frontend handles `[]` or `null` gracefully without crashing.
- [ ] **Date Parsing:** Timestamps (ISO 8601) are parsed correctly by `date-fns`.

## 5. Domain & URL Verification
- [ ] **Production:** `https://api.audicarefono.com.br` (Must use HTTPS).
- [ ] **CORS:** Browser console should not show `Access-Control-Allow-Origin` errors.

## 6. Real-time & WebSocket Verification
- [ ] **Connection:** WebSocket connection established (if applicable) or polling active.
- [ ] **Events:** Incoming messages trigger UI updates without refresh.
- [ ] **Reconnection:** System attempts to reconnect after network failure.

## 7. Inbox & Threads Verification
- [ ] **List Rendering:** Conversation list renders efficiently (virtualized if >100 items).
- [ ] **Active State:** Clicking a conversation highlights it and loads messages.
- [ ] **Unread Counts:** Unread badges update correctly.
- [ ] **Sorting:** Most recent conversations appear at the top.

## 8. Logs & Error Handling
- [ ] **Console Logs:** No red errors in DevTools console during normal operation.
- [ ] **User Feedback:** Toasts appear on success (Sent) and error (Failed).
- [ ] **Fallback:** UI shows "Error loading messages" instead of blank screen on API fail.

## 9. Debugging Tips
1.  **Check Network Tab:** Filter by "Fetch/XHR" and look for red status codes (4xx, 5xx).
2.  **Inspect Headers:** Ensure `Authorization` header is present in request.
3.  **Test with Curl:** Isolate frontend issues by testing the API directly.

## 10. CURL Testing Commands

### Health Check