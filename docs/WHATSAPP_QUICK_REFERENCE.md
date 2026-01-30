# ⚡ WhatsApp Integration: Quick Reference Guide

**Audience:** Developers, DevOps, Support

## 1. 🔗 API Endpoints Reference

**Base URL:** `https://api.audicarefono.com.br/api`

| Functionality | Method | Endpoint | Payload / Query |
| :--- | :---: | :--- | :--- |
| **Send Text** | `POST` | `/wa/send-text` | `{ "to": "5511...", "text": "..." }` |
| **Send Audio** | `POST` | `/wa/send-audio` | `FormData` (file field: `file`) |
| **Send Media** | `POST` | `/wa/send-media` | `FormData` (file field: `file`) |
| **Get Contacts** | `GET` | `/wa/contacts` | `?page=1&limit=20` |
| **Get History** | `GET` | `/wa/chat-history/:phone` | `?page=1&limit=50` |
| **Health Check** | `GET` | `/wa/health-check` | - |

---

## 2. 🚨 Common Error Codes

| Status | Code | Meaning | Suggested Action |
| :--- | :---: | :--- | :--- |
| 🔴 **401** | `UNAUTHORIZED` | Session Expired | User must log out and log back in. |
| 🔴 **400** | `BAD_REQUEST` | Invalid Payload | Check phone number format (must be E.164). |
| 🔴 **404** | `NOT_FOUND` | Endpoint/Resource Missing | Verify API URL configuration. |
| 🔴 **429** | `TOO_MANY_REQUESTS` | Rate Limit | Slow down polling or sending frequency. |
| 🔴 **500** | `SERVER_ERROR` | Backend Failure | Contact Backend Team / Check Uazapi status. |

---

## 3. 🛠️ Troubleshooting Quick Guide

### **Message Not Sending**
1.  Check **Network Tab**: Is the POST request failing?
2.  Check **Payload**: Is it `{ "to": "...", "text": "..." }`?
3.  Check **Auth**: Is the `Authorization` header present?

### **Messages Not Loading**
1.  Open **Inbox Debugger** (`?debug=true`).
2.  Verify `GET /contacts` is returning 200 OK.
3.  Check if Polling is active (logs should show "Polling cycle...").

### **"Network Error" / Offline**
1.  Check internet connection.
2.  Verify `api.audicarefono.com.br` is accessible from browser.
3.  Check for CORS errors in Console.

---

## 4. 💻 Curl Command Examples

### **Send Text Message**