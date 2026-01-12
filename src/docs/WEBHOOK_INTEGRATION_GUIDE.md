# 🎣 Webhook Integration Guide & Troubleshooting

**Last Updated:** 2025-11-24
**System:** AudiCare Inbox / WhatsApp Module

## 1. Overview
The Inbox module relies on a webhook-based architecture where an external provider (Uazapi/Evolution API) pushes message events to our backend `https://api.audicarefono.com.br/api/wa/webhook`. The frontend then retrieves these messages via optimized short-polling.

### Data Flow
1.  **External:** WhatsApp Message Received ➔ Uazapi Webhook
2.  **Backend:** `api.audicarefono.com.br` receives POST payload
3.  **Backend:** Validates token ➔ Stores in Database
4.  **Frontend:** `useWhatsApp` Polling (5s) ➔ `GET /api/wa/chat-history`
5.  **UI:** Updates Message List & Chat Window

## 2. Webhook Payload Requirements
The backend expects webhook payloads in a specific format. If you are configuring a custom instance, ensure your provider sends data matching this structure:

### Incoming Text Message