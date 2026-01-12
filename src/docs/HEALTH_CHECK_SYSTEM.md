# Health Check & Connectivity System

This document describes the architecture and usage of the backend connectivity validation system for the AudiCare Inbox.

## Overview

The system ensures reliability by constantly monitoring the connection between the Frontend, the Backend Proxy, and the WhatsApp Instance (UAZAPI).

### Components

1.  **HealthCheckService (`src/services/healthCheckService.js`)**
    *   **Role:** Central singleton service that manages connection state.
    *   **Mechanism:** Polls `GET /api/wa/health-check` every 30 seconds.
    *   **States:**
        *   `online`: Backend reachable, WhatsApp instance connected.
        *   `degraded`: Backend reachable, WhatsApp instance disconnected.
        *   `offline`: Backend unreachable or network error.
        *   `unknown`: Initial state or authentication missing.

2.  **ConnectionStatus Component (`src/components/ConnectionStatus.jsx`)**
    *   **Role:** UI indicator for the user.
    *   **Features:**
        *   Visual badge (Green/Yellow/Red).
        *   Ping animation for active connection.
        *   Tooltip with detailed metrics (Latency, Last Check Time).

3.  **Offline Queue**
    *   **Role:** Stores messages sent when the connection is lost.
    *   **Behavior:**
        *   Intercepts `sendText` calls in `whatsappService` when status is `offline`.
        *   Automatically retries sending queued messages when status returns to `online`.

## Usage

### Automatic Polling
The polling starts automatically when the `ConnectionStatus` component mounts (usually in the Inbox or Header).

### Manual Check
You can trigger a check manually: