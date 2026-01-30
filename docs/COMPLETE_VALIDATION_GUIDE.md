# Complete Validation Execution Guide

## Pre-Validation Checklist
1. Ensure backend is running and restarted.
2. Verify endpoints are available.

## Step-by-Step Validation
1. Open **Inbox** page.
2. Click **debug icon** to open InboxDebugPanel.
3. Go to **"Diagnostics"** tab.
4. Wait for all tests to complete.
5. Verify all **4 blocks** show green status.
6. Go to **"Validation Checklist"** tab.
7. Click **"Run Full Validation"**.
8. Wait for all **5 items** to show green checkmarks.

## Interpreting Results
- **Green**: Test passed successfully. System is functioning as expected.
- **Yellow**: Warning. System is functional but performance might be degraded or configuration is suboptimal.
- **Red**: Critical Error. The component failed completely and requires immediate attention.

## Troubleshooting
- **Common Issue: Endpoints failing**
  - Solution: Check internet connection and ensure the backend server is running.
- **Common Issue: Inbox not loading**
  - Solution: Clear browser cache and refresh. Verify user permissions.
- **Common Issue: WhatsApp disconnected**
  - Solution: Re-scan QR code in Channel Settings.
- **Common Issue: Realtime updates failing**
  - Solution: Check Supabase connection and WebSocket status in the browser console.

## Final Sign-Off
- Confirm that all items are **green**.
- **Export reports** using the download/export buttons in the diagnostics panel for documentation.