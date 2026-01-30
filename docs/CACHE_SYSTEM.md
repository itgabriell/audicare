# 📦 Inbox Cache System Documentation

**Version:** 1.0.0
**Technology:** IndexedDB (via `idb` wrapper)

## 1. Overview
The caching system provides a "Cache-First" strategy for message loading to ensure instant UI rendering and offline capabilities. It uses IndexedDB to store messages, contacts, and a queue for offline send actions.

## 2. Architecture

### `src/utils/cacheManager.js`
The low-level interface for IndexedDB operations.
-   **DB Name:** `AudiCareInboxCache`
-   **Stores:**
    -   `messages`: Stores message objects. Indexed by `id`, `conversation_id`, `timestamp`.
    -   `conversations`: Stores conversation metadata.
    -   `offline_queue`: Stores messages waiting to be sent.
    -   `meta`: System metadata (cleanup timestamps, etc).

### `src/hooks/useMessageCache.js`
React hook that bridges components with `cacheManager`.
-   **loadCache:** Automatically fetches messages on mount.
-   **updateCache:** Bulk saves messages (e.g., after network fetch).
-   **queueForSync:** Adds failed messages to offline queue.
-   **processOfflineQueue:** Iterates queue and attempts resend when online.

## 3. Key Features

### 3.1 Cache Limits & Expiration
-   **Limit:** Max 1000 messages per conversation. Older messages are automatically pruned during save operations.
-   **TTL:** Messages have a 24-hour Time-To-Live. `cleanExpiredCache()` runs on startup to remove stale data.

### 3.2 Offline Sync
1.  User sends message while offline.
2.  `sendMessage` fails -> calls `queueForSync`.
3.  Message stored in `offline_queue`.
4.  Browser detects `online` event -> calls `processOfflineQueue`.
5.  Queue items are sent one by one. On success, they are removed from queue.

## 4. Usage Example