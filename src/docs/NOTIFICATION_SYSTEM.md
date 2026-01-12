# 🔔 Notification System Documentation

**Version:** 1.0.0
**Module:** Inbox / Messaging
**Features:** Desktop Notifications, Sound Alerts, History Persistence, Quiet Hours

## 1. Overview
The notification system is designed to keep users informed about new incoming messages in the Inbox. It leverages the `NotificationService` to abstract the complexity of browser APIs, audio playback, and local storage persistence.

## 2. Architecture

### `src/services/notificationService.js`
The core logic resides here. This singleton class handles:
*   **Permissions:** Requests and tracks `Notification.permission`.
*   **Audio:** Manages the HTML5 `Audio` instance for sound alerts.
*   **Settings:** Loads/Saves preferences to `localStorage` (sound enabled, volume, quiet hours).
*   **History:** Persists a log of recent notifications to `localStorage` (last 50 items).
*   **Quiet Hours:** Checks current time against user-defined start/end times to suppress alerts.

### `src/components/Inbox/NotificationCenter.jsx`
The user interface component.
*   **Location:** Inbox sidebar header (Bell icon).
*   **Tabs:**
    *   **History:** Scrollable list of past notifications. Allows clearing history.
    *   **Settings:** Toggle switches for Sound/Desktop, Volume Slider, Quiet Hours inputs.

### Integration (`useWhatsApp.js`)
The hook responsible for fetching data now includes logic to trigger notifications:
1.  **Background Conversations:** Compares `unread_count` of incoming conversations list against the previous poll. If count increases, triggers a notification.
2.  **Active Conversation:** Compares `messages.length`. If new message arrives (and is not from 'me'), triggers a notification (Sound only if focused, Desktop if background).

## 3. Features

### 3.1 Notification Persistence
While true push notifications (when the app is closed) require a Service Worker and Backend push server, this system implements **History Persistence**.
*   All notifications generated while the app was open (even in background tabs) are saved to `localStorage`.
*   When the user reopens the app, they can view the "History" tab in the Notification Center to see what they missed.

### 3.2 Quiet Hours
*   Users can define a start and end time (e.g., 22:00 - 08:00).
*   During this window, `notificationService.notify()` will internally block sound and desktop alerts.
*   Notifications are still logged to History.

### 3.3 Desktop Notifications
*   Uses the standard Web Notification API.
*   Clicking a notification focuses the window and (where possible) navigates to the conversation.

## 4. Usage Guide

1.  **Enable Permissions:** Click the Bell icon -> Settings -> Toggle "Navegador". Browser will prompt for permission.
2.  **Adjust Volume:** Use the slider in Settings. Click "Testar" to hear the sound.
3.  **Check History:** Click the Bell icon -> History tab.