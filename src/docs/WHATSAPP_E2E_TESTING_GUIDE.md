# 🧪 WhatsApp Integration: End-to-End (E2E) Testing Guide

**Version:** 1.0.0
**Date:** 2025-11-24
**System:** AudiCare Inbox Module

## 1. Overview
This guide details the manual and automated steps required to verify the end-to-end functionality of the WhatsApp integration, covering message sending, receiving (webhook), real-time updates, and error handling.

---

## 2. Prerequisites
*   **Frontend:** Running locally (`http://localhost:3000`) or deployed.
*   **Backend:** `https://api.audicarefono.com.br/api` is accessible.
*   **Auth:** Valid user account (admin/owner role) logged in.
*   **Tools:** `curl` or Postman.

---

## 3. Test Cases

### 🟢 Test Case 1: Send Text Message (Frontend Flow)

**Objective:** Verify that a user can send a text message from the UI and it is successfully processed by the backend.

**Steps:**
1.  Navigate to `/inbox`.
2.  Select an active conversation or start a new one.
3.  Type "Test Message [TIMESTAMP]" in the input field.
4.  Click the **Send** (Paper plane) button.

**Expected Result:**
*   **UI:** Message appears immediately in the chat window (Optimistic Update).
*   **UI:** Message status indicator shows "check" or "sent" icon within 1-2 seconds.
*   **Network:** POST request to `/api/wa/send-text` returns `200 OK`.
*   **Payload Check:**