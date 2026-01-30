# Inbox & WhatsApp API Testing Guide

This guide provides manual testing instructions for the AudiCare Inbox API.

## 1. Prerequisites
- **Base URL:** `https://api.audicarefono.com.br/api/wa`
- **Authentication:** You need a valid Supabase Access Token (Bearer Token). You can get this from the browser's Local Storage (`sb-YOUR_PROJECT_ID-auth-token`) or by logging `supabase.auth.getSession()` in the console.

## 2. Testing Commands

### 2.1 Health Check
Verify the service is running and reachable.

**Request:**