# API Testing Guide

This guide provides step-by-step instructions for validating the integration with the secure API domain (`https://api.audicarefono.com.br/api`).

**Base URL:** `https://api.audicarefono.com.br/api`

---

## 1. General Verification Steps

### Browser DevTools Verification
1.  Open your browser's Developer Tools (F12 or Right-click > Inspect).
2.  Navigate to the **Network** tab.
3.  Refresh the page or perform an action (e.g., send a message).
4.  **Verify:**
    *   The **Request URL** starts with `https://api.audicarefono.com.br/api`.
    *   The **Status Code** is `200 OK` (or `201 Created`).
    *   The **Scheme** column shows `https`.
    *   There are **no** requests to the old IP `72.61.44.153`.

### SSL Certificate Check
1.  Navigate to `https://api.audicarefono.com.br/api/wa/health-check` in your browser.
2.  Click the **Lock icon** 🔒 in the address bar.
3.  **Verify:**
    *   "Connection is secure".
    *   Certificate is valid and issued to `audicarefono.com.br` (or appropriate wildcard).

### Mixed Content Check
1.  Open the **Console** tab in DevTools.
2.  Look for warnings like:
    > "Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'."
3.  **Action:** If found, these *must* be fixed immediately as browsers will block them.

---

## 2. Endpoint Testing with cURL

You can use `curl` in your terminal to test endpoints directly.

### WhatsApp Endpoints (`/wa`)

**Send Text Message**