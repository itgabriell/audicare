# 📱 UAZAPI Integration Documentation

**Backend Proxy:** `https://api.audicarefono.com.br/api/wa`
**Service:** `src/services/whatsappService.js`

## 1. Overview
This module integrates the AudiCare Inbox with **UAZAPI** (WhatsApp API) via a secure backend proxy. The frontend does not communicate directly with UAZAPI servers to protect instance credentials and tokens. All requests are authenticated via Supabase Sessions.

## 2. Architecture